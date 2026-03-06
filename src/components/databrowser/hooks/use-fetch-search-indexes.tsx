import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

export const FETCH_SEARCH_INDEXES_QUERY_KEY = "fetch-search-indexes"

// Parses the SEARCH.LISTINDEXES response into an array of index names.
// Response format: [["name", "idx1", "type", "STRING"], ["name", "idx2", "type", "STRING"], ...]
export function parseListIndexesResponse(result: string[][] | string[]): string[] {
  if (result.length === 0) return []

  // Nested array format: each entry is ["name", "<name>", "type", "<type>"]
  if (Array.isArray(result[0])) {
    return (result as string[][]).map((entry) => entry[1])
  }

  // Flat format fallback: ["name", "idx1", "type", "STRING", ...]
  const names: string[] = []
  const flat = result as string[]
  for (let i = 0; i + 1 < flat.length; i += 4) {
    if (flat[i] === "name") names.push(flat[i + 1])
  }
  return names
}

export const useFetchSearchIndexes = ({
  match,
  enabled,
}: { match?: string; enabled?: boolean } = {}) => {
  const { redisNoPipeline: redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
    enabled: enabled ?? true,
    queryFn: async () => {
      const LIMIT = 100
      let offset = 0
      const allNames: string[] = []

      while (true) {
        const args: string[] = ["search.listindexes"]
        if (match) args.push("MATCH", match)
        args.push("LIMIT", String(LIMIT), "OFFSET", String(offset))

        const result = await redis.exec<string[][]>(args as [string, ...string[]])
        const names = parseListIndexesResponse(result)
        allNames.push(...names)

        if (names.length < LIMIT) break
        offset += names.length
      }

      return allNames
    },
  })
}
