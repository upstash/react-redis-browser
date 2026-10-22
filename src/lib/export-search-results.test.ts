import type { Redis } from "@upstash/redis"
import { describe, expect, test } from "bun:test"

import { exportSearchResults } from "./export-search-results"

// Mimics the app's client (automaticDeserialization: false): JSON and string values are raw text.
const fakeRedis = (opts: { total: number; values: Record<string, unknown> }) => {
  const keys = Array.from({ length: opts.total }, (_, i) => `k:${i}`)
  const raw = (key: string) => opts.values[key] ?? opts.values["*"]
  return {
    search: {
      index: () => ({
        query: async ({ limit, offset }: { limit: number; offset: number }) =>
          keys.slice(offset, offset + limit).map((key) => ({ key, score: 1 })),
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

  test("keeps every digit of integers past 2^53", async () => {
    const redis = fakeRedis({ total: 1, values: { "*": '{"big":12345678901234567890,"n":1.5}' } })

    expect(await content(redis, "json")).toContain('"big": 12345678901234567890,')
    expect(await content(redis, "json", "csv")).toBe(
      "key,score,data.big,data.n\nk:0,1,12345678901234567890,1.5"
    )
  })

  test("keeps a top-level big integer as the value", async () => {
    const redis = fakeRedis({ total: 1, values: { "*": "12345678901234567890" } })

    expect(await content(redis, "string")).toContain('"data": 12345678901234567890')
    expect(await content(redis, "string", "csv")).toBe("key,score,data\nk:0,1,12345678901234567890")
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
})
