import type { Redis } from "@upstash/redis"

/**
 * Lists search indexes using the SEARCH.LISTINDEXES command.
 * Supports pagination via LIMIT/OFFSET and optional MATCH filtering.
 */
export async function listSearchIndexes(
  redis: Redis,
  {
    match,
    limit,
    offset = 0,
  }: {
    match?: string
    limit: number
    offset?: number
  }
): Promise<string[]> {
  const args: string[] = ["search.listindexes"]
  if (match) args.push("MATCH", match)
  args.push("LIMIT", String(limit), "OFFSET", String(offset))

  const result = await redis.exec<string[][]>(args as [string, ...string[]])
  return parseListIndexesResponse(result)
}

/**
 * Collects all search indexes by paginating through SEARCH.LISTINDEXES.
 */
export async function listAllSearchIndexes(
  redis: Redis,
  { match }: { match?: string } = {}
): Promise<string[]> {
  const PAGE_SIZE = 100
  let offset = 0
  const allNames: string[] = []

  while (true) {
    const names = await listSearchIndexes(redis, { match, limit: PAGE_SIZE, offset })
    allNames.push(...names)

    if (names.length < PAGE_SIZE) break
    offset += names.length
  }

  return allNames
}

// Parses the SEARCH.LISTINDEXES response into an array of index names.
// Response format: [["name", "idx1", "type", "STRING"], ...]
function parseListIndexesResponse(result: string[][]): string[] {
  return result.map((entry) => entry[1])
}
