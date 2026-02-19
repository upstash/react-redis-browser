import type { Redis } from "@upstash/redis"

/**
 * Scans Redis keys matching a pattern using SCAN (non-blocking).
 * Optionally limits the total number of keys returned.
 */
export async function scanKeys(
  redis: Redis,
  {
    match,
    type,
    count = 100,
    limit,
  }: {
    match?: string
    type?: string
    count?: number
    limit?: number
  } = {}
): Promise<string[]> {
  let cursor = "0"
  const result: string[] = []

  while (true) {
    const [newCursor, keys] = await redis.scan(cursor, {
      count,
      type,
      match,
    })

    result.push(...keys)

    if (limit && result.length >= limit) {
      return result.slice(0, limit)
    }

    if (newCursor === "0") break
    cursor = newCursor
  }

  return result
}
