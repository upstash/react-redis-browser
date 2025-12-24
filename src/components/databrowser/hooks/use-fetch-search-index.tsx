import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

export const FETCH_SEARCH_INDEX_QUERY_KEY = "fetch-search-index"

export const useFetchSearchIndex = (indexName: string) => {
  const { redisNoPipeline: redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_SEARCH_INDEX_QUERY_KEY, indexName],
    queryFn: async () => {
      const result = await redis.search.index(indexName).describe()
      return result
    },
  })
}
