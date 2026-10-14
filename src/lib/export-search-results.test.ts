import type { Redis } from "@upstash/redis"
import { describe, expect, test } from "bun:test"

import { exportSearchResults, MAX_EXPORT_RESULTS } from "./export-search-results"

// Mimics the app's client (automaticDeserialization: false): JSON and string values are raw text,
// and SEARCH.QUERY rejects OFFSET above 10,000 like the server does.
const fakeRedis = (opts: { total: number; values: Record<string, unknown> }) => {
  const keys = Array.from({ length: opts.total }, (_, i) => `k:${i}`)
  const raw = (key: string) => opts.values[key] ?? opts.values["*"]
  return {
    search: {
      index: () => ({
        query: async ({ limit, offset }: { limit: number; offset: number }) => {
          if (offset > 10_000) throw new Error("ERR value is not an integer or out of range")
          return keys.slice(offset, offset + limit).map((key) => ({ key, score: 1 }))
        },
        count: async () => ({ count: opts.total }),
      }),
    },
    json: { get: async (key: string) => raw(key) },
    get: async (key: string) => raw(key),
    hgetall: async (key: string) => raw(key),
  } as unknown as Redis
}

const run = (redis: Redis, dataType: "string" | "hash" | "json", format: "json" | "csv" = "json") =>
  exportSearchResults({
    searchRedis: redis,
    readRedis: redis,
    indexName: "idx",
    filter: {},
    dataType,
    format,
  })

const content = async (...args: Parameters<typeof run>) => {
  const result = await run(...args)
  return result.content
}

describe("exportSearchResults", () => {
  test("parses json documents into fields", async () => {
    const redis = fakeRedis({ total: 1, values: { "*": '{"name":"Ann","meta":{"age":3}}' } })

    expect(JSON.parse(await content(redis, "json"))).toEqual([
      { key: "k:0", score: 1, data: { name: "Ann", meta: { age: 3 } } },
    ])
    expect(await content(redis, "json", "csv")).toBe(
      "key,score,data.meta.age,data.name\nk:0,1,3,Ann"
    )
  })

  test("keeps non-json string values as-is", async () => {
    const redis = fakeRedis({ total: 1, values: { "*": "plain" } })
    expect(await content(redis, "string", "csv")).toBe("key,score,data\nk:0,1,plain")
  })

  test("hash fields named key or score don't overwrite the document key", async () => {
    const redis = fakeRedis({ total: 1, values: { "*": { key: "field", score: "x" } } })

    expect(JSON.parse(await content(redis, "hash"))).toEqual([
      { key: "k:0", score: 1, data: { key: "field", score: "x" } },
    ])
  })

  test("stops at the search offset limit instead of failing", async () => {
    const exact = await run(
      fakeRedis({ total: MAX_EXPORT_RESULTS, values: { "*": "v" } }),
      "string"
    )
    expect(exact).toMatchObject({ count: MAX_EXPORT_RESULTS, truncated: false })

    const over = await run(fakeRedis({ total: 12_345, values: { "*": "v" } }), "string")
    expect(over).toMatchObject({ count: MAX_EXPORT_RESULTS, truncated: true })
  })
})
