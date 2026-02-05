import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

export const FETCH_SEARCH_INDEXES_QUERY_KEY = "fetch-search-indexes"

export const useFetchSearchIndexes = ({
  match,
  enabled,
}: { match?: string; enabled?: boolean } = {}) => {
  const { redisNoPipeline: redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
    enabled: enabled ?? true,
    queryFn: async () => {
      let cursor = "0"
      const finalResult: string[] = []

      while (true) {
        const [newCursor, results] = await redis.scan(cursor, {
          count: 100,
          type: "search",
          match: match,
        })

        finalResult.push(...results)

        if (newCursor === "0") break

        cursor = newCursor
      }

      return finalResult
    },
  })
}
