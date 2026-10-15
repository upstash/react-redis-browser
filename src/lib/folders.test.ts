import type { Redis } from "@upstash/redis"
import { describe, expect, test } from "bun:test"

import {
  collapseCrumbs,
  escapeGlob,
  execFolderScan,
  FOLDER_KEYS_STALE_TIME_MS,
  formatFolderCount,
  getEntryLabel,
  getFolderCrumbs,
  getFolderMatch,
  getFolderQuery,
  getKeysStaleTime,
  getParentFolder,
  isFolderScanUnsupported,
  isPrefixSearch,
  parseFolderCount,
  parseFolderScan,
} from "./folders"

describe("parseFolderScan", () => {
  test("parses key, type and count triples", () => {
    expect(
      parseFolderScan([
        "a",
        "string",
        "1",
        "big:",
        "folder",
        "100+",
        "order:1:items",
        "hash",
        1,
        "user:",
        "folder",
        5,
        "end:",
        "folder",
        "7+",
      ])
    ).toEqual([
      { kind: "key", key: "a", type: "string" },
      { kind: "folder", key: "big:", count: { n: 100, atLeast: true } },
      { kind: "key", key: "order:1:items", type: "hash" },
      { kind: "folder", key: "user:", count: { n: 5, atLeast: false } },
      { kind: "folder", key: "end:", count: { n: 7, atLeast: true } },
    ])
  })

  test("ignores a trailing partial triple", () => {
    expect(parseFolderScan(["a", "string", "1", "b", "set"])).toEqual([
      { kind: "key", key: "a", type: "string" },
    ])
  })

  test("returns no entries for an empty page", () => {
    expect(parseFolderScan([])).toEqual([])
  })
})

describe("getFolderMatch", () => {
  test("appends the search pattern to the folder", () => {
    expect(getFolderMatch("user:", "1*")).toBe("user:1*")
    expect(getFolderMatch("user:", "")).toBe("user:*")
    expect(getFolderMatch("", "")).toBe("*")
  })

  test("escapes glob characters in folder names", () => {
    expect(escapeGlob(String.raw`a*b?c[d]e\f`)).toBe(String.raw`a\*b\?c\[d\]e\\f`)
    expect(getFolderMatch("cache[1]:", "x*")).toBe(String.raw`cache\[1\]:x*`)
  })
})

describe("parseFolderCount", () => {
  test("parses exact counts and lower bounds", () => {
    expect(parseFolderCount("5")).toEqual({ n: 5, atLeast: false })
    expect(parseFolderCount(5)).toEqual({ n: 5, atLeast: false })
    expect(parseFolderCount("7+")).toEqual({ n: 7, atLeast: true })
    expect(parseFolderCount("100+")).toEqual({ n: 100, atLeast: true })
    expect(parseFolderCount("bad")).toEqual({ n: 0, atLeast: false })
  })
})

describe("isPrefixSearch", () => {
  test("accepts no search and a single trailing star", () => {
    expect(isPrefixSearch("")).toBe(true)
    expect(isPrefixSearch("ses*")).toBe(true)
    expect(isPrefixSearch("*")).toBe(true)
  })

  test("rejects other globs", () => {
    expect(isPrefixSearch("*session*")).toBe(false)
    expect(isPrefixSearch("user:*:session")).toBe(false)
    expect(isPrefixSearch("ses?*")).toBe(false)
    expect(isPrefixSearch("a[bc]*")).toBe(false)
    expect(isPrefixSearch(String.raw`a\*`)).toBe(false)
    expect(isPrefixSearch("exact")).toBe(false)
  })
})

describe("getFolderQuery", () => {
  const base = { wantsFolders: true, folder: "user:", delimiter: ":" }

  test("a prefix search scans folders until the server says no", () => {
    expect(getFolderQuery({ ...base, supported: undefined, search: "1*" })).toEqual({
      folder: "user:",
      delimiter: ":",
    })
    expect(getFolderQuery({ ...base, supported: true, search: "" })).toBeDefined()
    expect(getFolderQuery({ ...base, supported: false, search: "" })).toBeUndefined()
  })

  test("a glob search waits until support is known", () => {
    expect(getFolderQuery({ ...base, supported: undefined, search: "*a*" })).toBeUndefined()
    expect(getFolderQuery({ ...base, supported: false, search: "*a*" })).toBeUndefined()
    expect(getFolderQuery({ ...base, supported: true, search: "*a*" })).toBeDefined()
  })

  test("the flat view never scans folders", () => {
    expect(
      getFolderQuery({ ...base, wantsFolders: false, supported: true, search: "" })
    ).toBeUndefined()
  })
})

describe("getKeysStaleTime", () => {
  test("keeps folder pages and refetches the flat list as before", () => {
    expect(getKeysStaleTime({ folder: "", delimiter: ":" })).toBe(FOLDER_KEYS_STALE_TIME_MS)
    expect(getKeysStaleTime()).toBe(0)
  })
})

describe("formatFolderCount", () => {
  test("shows lower bounds with a plus and large counts as 99+", () => {
    expect(formatFolderCount({ n: 2, atLeast: false })).toBe("2")
    expect(formatFolderCount({ n: 7, atLeast: true })).toBe("7+")
    expect(formatFolderCount({ n: 99, atLeast: false })).toBe("99")
    expect(formatFolderCount({ n: 100, atLeast: false })).toBe("99+")
    expect(formatFolderCount({ n: 100, atLeast: true })).toBe("99+")
  })
})

describe("isFolderScanUnsupported", () => {
  test("detects servers that reject DELIMITER", () => {
    expect(isFolderScanUnsupported(new Error("ERR syntax error, command was: ..."))).toBe(true)
    expect(isFolderScanUnsupported(new Error("ERR syntax error"))).toBe(true)
    expect(isFolderScanUnsupported(new Error("fetch failed"))).toBe(false)
    expect(
      isFolderScanUnsupported(
        new Error(
          'ERR max requests limit exceeded, command was: [["scan","0","match","syntax error:unknown:*"]]'
        )
      )
    ).toBe(false)
    expect(isFolderScanUnsupported("ERR syntax error")).toBe(false)
  })
})

// A redis client whose REST requests answer with `response`
const fakeRedis = (response: unknown) => {
  const requests: unknown[] = []
  const client = {
    request: async (request: unknown) => {
      requests.push(request)
      return response
    },
  }
  return { redis: { client } as unknown as Redis, requests }
}

describe("execFolderScan", () => {
  const command: [string, ...string[]] = ["SCAN", "0", "DELIMITER", ":", "WITHCOUNT"]

  test("sends the command through the pipeline endpoint", async () => {
    const values = ["a", "string", "1", "big:", "folder", "100+"]
    const { redis, requests } = fakeRedis([{ result: ["0", values] }])

    const [cursor, result] = await execFolderScan<[string, unknown[]]>(redis, command)

    expect(requests).toEqual([{ path: ["pipeline"], body: [command] }])
    expect(cursor).toBe("0")
    expect(parseFolderScan(result)).toEqual([
      { kind: "key", key: "a", type: "string" },
      { kind: "folder", key: "big:", count: { n: 100, atLeast: true } },
    ])
  })

  test("throws errors from inside the pipeline response like redis.exec", async () => {
    const { redis } = fakeRedis([{ error: "ERR syntax error" }])
    const error = await execFolderScan(redis, command).catch((error: unknown) => error)

    expect(error).toBeInstanceOf(Error)
    expect((error as Error).name).toBe("UpstashError")
    expect((error as Error).message).toBe(
      `ERR syntax error, command was: ${JSON.stringify(command)}`
    )
    expect(isFolderScanUnsupported(error)).toBe(true)
  })

  test("keeps other errors", async () => {
    const { redis } = fakeRedis([{ error: "NOPERM this user has no permissions" }])
    const error = await execFolderScan(redis, command).catch((error: unknown) => error)

    expect(error).toBeInstanceOf(Error)
    expect(isFolderScanUnsupported(error)).toBe(false)
  })
})

describe("getFolderCrumbs", () => {
  test("splits a folder into its path segments", () => {
    expect(getFolderCrumbs("user:1:sessions:", ":")).toEqual([
      { name: "user", folder: "user:" },
      { name: "1", folder: "user:1:" },
      { name: "sessions", folder: "user:1:sessions:" },
    ])
  })

  test("returns nothing for the root", () => {
    expect(getFolderCrumbs("", ":")).toEqual([])
  })

  test("keeps empty segments", () => {
    expect(getFolderCrumbs("dir::", ":")).toEqual([
      { name: "dir", folder: "dir:" },
      { name: "", folder: "dir::" },
    ])
  })

  test("supports multi character delimiters", () => {
    expect(getFolderCrumbs("a//b//", "//")).toEqual([
      { name: "a", folder: "a//" },
      { name: "b", folder: "a//b//" },
    ])
  })

  test("keeps a trailing segment without a delimiter", () => {
    expect(getFolderCrumbs("a:b", ":")).toEqual([
      { name: "a", folder: "a:" },
      { name: "b", folder: "a:b" },
    ])
  })
})

const names = ({ visible, hidden }: ReturnType<typeof collapseCrumbs>) => ({
  visible: visible.map((crumb) => (crumb === "hidden" ? "..." : crumb.name)),
  hidden: hidden.map((crumb) => crumb.name),
})

describe("collapseCrumbs", () => {
  const parents = getFolderCrumbs("a:b:c:d:e:", ":")
  test("shows every parent when they fit", () => {
    expect(names(collapseCrumbs(parents.slice(0, 3), 3))).toEqual({
      visible: ["a", "b", "c"],
      hidden: [],
    })
  })

  test("keeps the first and the closest parents", () => {
    expect(names(collapseCrumbs(parents, 3))).toEqual({
      visible: ["a", "...", "d", "e"],
      hidden: ["b", "c"],
    })
    expect(names(collapseCrumbs(parents, 2))).toEqual({
      visible: ["a", "...", "e"],
      hidden: ["b", "c", "d"],
    })
  })

  test("keeps only the closest parent, then none, when narrow", () => {
    expect(names(collapseCrumbs(parents, 1))).toEqual({
      visible: ["...", "e"],
      hidden: ["a", "b", "c", "d"],
    })
    expect(names(collapseCrumbs(parents, 0))).toEqual({
      visible: ["..."],
      hidden: ["a", "b", "c", "d", "e"],
    })
    expect(names(collapseCrumbs([], 0))).toEqual({ visible: [], hidden: [] })
  })
})

describe("getParentFolder", () => {
  test("goes one level up", () => {
    expect(getParentFolder("user:1:sessions:", ":")).toBe("user:1:")
    expect(getParentFolder("user:", ":")).toBe("")
    expect(getParentFolder("", ":")).toBe("")
  })
})

describe("getEntryLabel", () => {
  test("shows folders and keys relative to the open folder", () => {
    expect(
      getEntryLabel(
        { kind: "folder", key: "user:1:", count: { n: 3, atLeast: false } },
        "user:",
        ":"
      )
    ).toEqual({
      path: "",
      name: "1",
    })
    expect(getEntryLabel({ kind: "key", key: "user:h", type: "hash" }, "user:", ":")).toEqual({
      path: "",
      name: "h",
    })
  })

  test("splits the collapsed path of a single key folder", () => {
    expect(
      getEntryLabel({ kind: "key", key: "order:1:items", type: "string" }, "order:", ":")
    ).toEqual({ path: "1:", name: "items" })
  })

  test("splits folders found by a search that crosses a delimiter", () => {
    expect(
      getEntryLabel({ kind: "folder", key: "user:1:", count: { n: 3, atLeast: false } }, "", ":")
    ).toEqual({
      path: "user:",
      name: "1",
    })
  })

  test("handles empty names", () => {
    expect(
      getEntryLabel({ kind: "folder", key: "dir::", count: { n: 2, atLeast: false } }, "dir:", ":")
    ).toEqual({
      path: "",
      name: "",
    })
  })
})
