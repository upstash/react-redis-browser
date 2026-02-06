import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"
import type { Redis } from "@upstash/redis"

export const FETCH_SEARCH_INDEX_QUERY_KEY = "fetch-search-index"

type RedisSearchDescribeFunc = ReturnType<Redis["search"]["index"]>["describe"]

export type SearchIndex = Awaited<ReturnType<RedisSearchDescribeFunc>>
export type SearchIndexSchema = SearchIndex["schema"]

export const useFetchSearchIndex = (
  indexName?: string,
  { enabled = true }: { enabled?: boolean } = {}
) => {
  const { redisNoPipeline: redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_SEARCH_INDEX_QUERY_KEY, indexName],
    queryFn: async () => {
      if (!indexName) return
      const result = await redis.search
        .index({
          name: indexName,
        })
        .describe()
      return result
    },
    enabled: Boolean(indexName) && enabled,
  })
}
