import type { Redis } from "@upstash/redis"
import { describe, expect, test } from "bun:test"

import { exportSearchResults, MAX_EXPORT_RESULTS } from "./export-search-results"

// SEARCH.QUERY rejects OFFSET above 10,000 like the server does.
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

describe("exportSearchResults", () => {
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
