import { describe, expect, test } from "bun:test"

import { replaceIndex, ReplaceIndexError, type SearchClient } from "./replace-index"

type Operation = "list" | "create" | "wait" | "addAlias" | "deleteAlias" | "drop"

/**
 * Index and alias state like redis-server keeps it: queries and SEARCH.WAITINDEXING resolve an
 * alias before an index with the same name, and SEARCH.DROP ignores aliases.
 */
const fakeRedis = (
  indexes: Record<string, string>,
  aliases: Record<string, string> = {},
  fail: (operation: Operation, name: string) => boolean = () => false
) => {
  const state = { indexes: { ...indexes }, aliases: { ...aliases } }
  const queried: string[] = [...Object.keys(indexes), ...Object.keys(aliases)]
  // Every name that was queryable must stay queryable after every change
  const outages: string[] = []
  // Indexes that were waited on, so they have every write
  const waited = new Set(Object.keys(indexes))
  const resolve = (name: string) => state.aliases[name] ?? name
  const unwaited = () => queried.filter((name) => !waited.has(resolve(name)))
  const check = (operation: Operation, name: string) => {
    if (fail(operation, name)) throw new Error(`${operation} ${name} failed`)
  }
  const changed = () => {
    for (const name of queried) {
      if (!Object.hasOwn(state.indexes, resolve(name))) outages.push(name)
    }
  }
  const index = (name: string) => ({
    waitIndexing: async () => {
      check("wait", name)
      waited.add(resolve(name))
      return 1 as const
    },
    drop: async () => {
      check("drop", name)
      if (!Object.hasOwn(state.indexes, name)) return 0 as const
      delete state.indexes[name]
      waited.delete(name)
      changed()
      return 1 as const
    },
  })
  const redis = {
    search: {
      index: ({ name }: { name: string }) => index(name),
      alias: {
        list: async () => {
          check("list", "")
          return { ...state.aliases }
        },
        add: async ({ indexName, alias }: { indexName: string; alias: string }) => {
          check("addAlias", alias)
          const added = !Object.hasOwn(state.aliases, alias)
          state.aliases[alias] = indexName
          changed()
          return added ? (1 as const) : (2 as const)
        },
        delete: async ({ alias }: { alias: string }) => {
          check("deleteAlias", alias)
          const deleted = Object.hasOwn(state.aliases, alias)
          delete state.aliases[alias]
          changed()
          return deleted ? (1 as const) : (0 as const)
        },
      },
    },
  } as unknown as SearchClient
  const create = async (name: string) => {
    check("create", name)
    if (Object.hasOwn(state.indexes, name)) throw new Error(`Index ${name} already exists`)
    state.indexes[name] = "new"
    return index(name)
  }
  return { redis, create, state, outages, unwaited }
}

const replace = async (fake: ReturnType<typeof fakeRedis>, name = "users") => {
  try {
    await replaceIndex(fake.redis, name, fake.create)
  } catch (error) {
    if (error instanceof ReplaceIndexError) return error
    throw error
  }
}

const temporaryIndex = (state: { indexes: Record<string, string> }) =>
  Object.keys(state.indexes).find((name) => name.startsWith("users-"))

const servedByTemporary = (temporary: string) =>
  `"users" is served by the temporary index "${temporary}"`

describe("replaceIndex", () => {
  test("re-creates the index under its name without an outage", async () => {
    const fake = fakeRedis({ users: "old", other: "old" }, { people: "users", things: "other" })
    expect(await replace(fake)).toBeUndefined()
    expect(fake.state).toEqual({
      indexes: { users: "new", other: "old" },
      aliases: { people: "users", things: "other" },
    })
    expect(fake.outages).toEqual([])
    expect(fake.unwaited()).toEqual([])
  })

  test.each([
    ["create", "users-"],
    ["wait", "users-"],
    ["addAlias", "users"],
    ["addAlias", "people"],
  ] as const)("changes nothing when the %s step on %s fails", async (operation, target) => {
    let failed = false
    const fake = fakeRedis({ users: "old" }, { people: "users" }, (op, name) => {
      if (failed || op !== operation || !name.startsWith(target)) return false
      if (target === "users" && name !== "users") return false
      failed = true
      return true
    })
    const error = await replace(fake)
    expect(error?.message).toContain("nothing was changed")
    expect(fake.state).toEqual({ indexes: { users: "old" }, aliases: { people: "users" } })
    expect(fake.outages).toEqual([])
  })

  test("names the temporary index when undoing a failed switch fails", async () => {
    const fake = fakeRedis({ users: "old" }, { people: "users" }, (op, name) =>
      op === "addAlias" ? name === "people" : op === "deleteAlias"
    )
    const error = await replace(fake)
    const temporary = temporaryIndex(fake.state)
    expect(temporary).toBeDefined()
    expect(error?.message).toContain(`drop the index "${temporary}"`)
    expect(fake.outages).toEqual([])
  })

  test.each([
    ["drop", "users", servedByTemporary],
    ["create", "users", servedByTemporary],
    ["deleteAlias", "users", servedByTemporary],
    [
      "wait",
      "users",
      (temporary: string) =>
        `so the temporary index "${temporary}" and the aliases pointing at it were left in place`,
    ],
    [
      "addAlias",
      "people",
      (temporary: string) =>
        `the aliases "people" still point at the temporary index "${temporary}"`,
    ],
  ] as const)(
    "keeps serving the new index when the %s step on %s fails",
    async (operation, target, expected) => {
      let switched = false
      const fake = fakeRedis({ users: "old" }, { people: "users" }, (op, name) => {
        if (op === "addAlias" && name === "people" && !switched) {
          switched = true
          return false
        }
        return op === operation && name === target && (op !== "addAlias" || switched)
      })
      const error = await replace(fake)
      const temporary = temporaryIndex(fake.state)
      expect(error?.message).toContain(expected(temporary!))
      expect(fake.state.indexes[temporary!]).toBe("new")
      expect(fake.outages).toEqual([])
    }
  )

  test("reports a temporary index it could not drop", async () => {
    const fake = fakeRedis({ users: "old" }, {}, (op, name) => op === "drop" && name !== "users")
    const error = await replace(fake)
    expect(error?.message).toContain(`dropping the temporary index "${temporaryIndex(fake.state)}"`)
    expect(fake.state.indexes.users).toBe("new")
    expect(fake.state.aliases).toEqual({})
    expect(fake.outages).toEqual([])
  })

  test("refuses an index whose name is also an alias", async () => {
    const fake = fakeRedis({ users: "old", other: "old" }, { users: "other" })
    const error = await replace(fake)
    expect(error?.message).toBe(`"users" is also an alias of "other", nothing was changed`)
    expect(fake.state.indexes).toEqual({ users: "old", other: "old" })
  })
})
