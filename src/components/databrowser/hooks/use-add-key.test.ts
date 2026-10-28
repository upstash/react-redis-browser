import type { SearchFilter } from "@/store"
import type { DataType } from "@/types"
import { QueryClient } from "@tanstack/react-query"
import type { Redis } from "@upstash/redis"
import { describe, expect, test } from "bun:test"

import type { KeyListEntry } from "@/lib/folders"

import { indexMayContainKey, keyScanMatches, updateCacheAfterAddKey } from "./use-add-key"
import { FETCH_KEY_TYPE_QUERY_KEY } from "./use-fetch-key-type"
import { FETCH_SEARCH_INDEX_QUERY_KEY, type SearchIndex } from "./use-fetch-search-index"
import { FETCH_KEYS_QUERY_KEY } from "./use-keys"

const emptySearch: SearchFilter = { key: "", type: undefined }
const noValuesSearch = { index: "", queries: {}, queryBuilderMode: "ui", query: "" }

const keyScanKey = (search: SearchFilter) => [FETCH_KEYS_QUERY_KEY, search, noValuesSearch, false]
const valuesSearchKey = (index: string) => [
  FETCH_KEYS_QUERY_KEY,
  emptySearch,
  { index, queries: {}, queryBuilderMode: "ui", query: "" },
  true,
]

const index = (dataType: SearchIndex["dataType"], prefixes: string[]) =>
  ({ dataType, prefixes }) as unknown as SearchIndex

const setup = () => {
  const client = new QueryClient()
  const waited: string[] = []
  const redis = {
    search: {
      index: ({ name }: { name: string }) => ({
        waitIndexing: async () => {
          waited.push(name)
          return 1
        },
      }),
    },
  } as unknown as Redis

  const seedList = (queryKey: unknown[]) =>
    client.setQueryData(queryKey, {
      pages: [
        {
          entries: [{ kind: "key", key: "existing", type: "string" }] as KeyListEntry[],
          hasNextPage: false,
        },
      ],
      pageParams: ["0"],
    })
  const listKeys = (queryKey: unknown[]) =>
    client
      .getQueryData<{ pages: { entries: KeyListEntry[] }[] }>(queryKey)
      ?.pages[0].entries.map(({ key }) => key)
  const isInvalidated = (queryKey: unknown[]) => client.getQueryState(queryKey)?.isInvalidated

  const add = async (key: string, type: DataType) => {
    updateCacheAfterAddKey({ client, redis, key, type })
    // Let the waitIndexing callbacks run
    await new Promise((resolve) => setTimeout(resolve, 0))
  }

  return { client, waited, seedList, listKeys, isInvalidated, add }
}

describe("keyScanMatches", () => {
  test.each([
    [emptySearch, "user:1", "hash", true],
    [{ key: "user:*", type: undefined }, "user:1", "hash", true],
    [{ key: "user:*", type: undefined }, "order:1", "hash", false],
    [{ key: "", type: "hash" }, "user:1", "hash", true],
    [{ key: "", type: "string" }, "user:1", "hash", false],
    [{ key: "", type: "search" }, "user:1", "hash", false],
    [{ key: "user:*", type: "hash" }, "user:1", "hash", true],
  ] as [SearchFilter, string, DataType, boolean][])(
    "%p lists %p (%p): %p",
    (search, key, type, expected) => {
      expect(keyScanMatches(search, key, type)).toBe(expected)
    }
  )
})

describe("indexMayContainKey", () => {
  test.each([
    [undefined, "user:1", "hash", true],
    [index("hash", ["user:"]), "user:1", "hash", true],
    [index("hash", ["order:", "user:"]), "user:1", "hash", true],
    [index("hash", ["user:"]), "order:1", "hash", false],
    [index("json", ["user:"]), "user:1", "hash", false],
    [index("string", []), "anything", "string", true],
  ] as [SearchIndex | undefined, string, DataType, boolean][])(
    "%p may contain %p (%p): %p",
    (details, key, type, expected) => {
      expect(indexMayContainKey(details, key, type)).toBe(expected)
    }
  )
})

describe("updateCacheAfterAddKey", () => {
  test("adds the key only to key scans whose filters it matches", async () => {
    const { seedList, listKeys, add } = setup()
    const all = keyScanKey(emptySearch)
    const byPattern = keyScanKey({ key: "user:*", type: undefined })
    const otherPattern = keyScanKey({ key: "order:*", type: undefined })
    const byType = keyScanKey({ key: "", type: "hash" })
    const otherType = keyScanKey({ key: "", type: "string" })
    const indexList = keyScanKey({ key: "", type: "search" })
    for (const queryKey of [all, byPattern, otherPattern, byType, otherType, indexList]) {
      seedList(queryKey)
    }

    await add("user:1", "hash")

    expect(listKeys(all)).toEqual(["user:1", "existing"])
    expect(listKeys(byPattern)).toEqual(["user:1", "existing"])
    expect(listKeys(byType)).toEqual(["user:1", "existing"])
    expect(listKeys(otherPattern)).toEqual(["existing"])
    expect(listKeys(otherType)).toEqual(["existing"])
    expect(listKeys(indexList)).toEqual(["existing"])
  })

  test("refetches folder views instead of inserting the key", async () => {
    const { seedList, listKeys, isInvalidated, add } = setup()
    const flat = keyScanKey(emptySearch)
    const folders = [...keyScanKey(emptySearch), { folder: "user:", delimiter: ":" }]
    seedList(flat)
    seedList(folders)

    await add("user:1", "hash")

    expect(listKeys(folders)).toEqual(["existing"])
    expect(isInvalidated(folders)).toBe(true)
    expect(isInvalidated(flat)).toBe(false)
  })

  test("caches the key type so the key shows even when no list has it", async () => {
    const { client, add } = setup()

    await add("user:1", "hash")

    expect(client.getQueryData<DataType>([FETCH_KEY_TYPE_QUERY_KEY, "user:1"])).toBe("hash")
  })

  test("refetches the value searches of indexes that can contain the key, after indexing", async () => {
    const { client, waited, seedList, listKeys, isInvalidated, add } = setup()
    const users = valuesSearchKey("users")
    const orders = valuesSearchKey("orders")
    const unknown = valuesSearchKey("unknown")
    seedList(users)
    seedList(orders)
    seedList(unknown)
    client.setQueryData([FETCH_SEARCH_INDEX_QUERY_KEY, "users"], index("hash", ["user:"]))
    client.setQueryData([FETCH_SEARCH_INDEX_QUERY_KEY, "orders"], index("hash", ["order:"]))
    const keyScan = keyScanKey(emptySearch)
    seedList(keyScan)

    await add("user:1", "hash")

    // Value searches are refetched, never prepended to, since the query may exclude the key
    expect(listKeys(users)).toEqual(["existing"])
    expect(waited.sort()).toEqual(["unknown", "users"])
    expect(isInvalidated(users)).toBe(true)
    expect(isInvalidated(unknown)).toBe(true)
    expect(isInvalidated(orders)).toBe(false)
    expect(isInvalidated(keyScan)).toBe(false)
  })

  test("refetches the value searches even when waiting for indexing fails", async () => {
    const client = new QueryClient()
    const redis = {
      search: {
        index: () => ({ waitIndexing: () => Promise.reject(new Error("failed")) }),
      },
    } as unknown as Redis
    const users = valuesSearchKey("users")
    client.setQueryData(users, { pages: [], pageParams: [] })

    updateCacheAfterAddKey({ client, redis, key: "user:1", type: "hash" })
    await new Promise((resolve) => setTimeout(resolve, 0))

    expect(client.getQueryState(users)?.isInvalidated).toBe(true)
  })
})
