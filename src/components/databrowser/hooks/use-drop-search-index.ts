import { useRedis } from "@/redis-context"
import { useMutation } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { FETCH_SEARCH_INDEXES_QUERY_KEY } from "./use-fetch-search-indexes"

export const useDropSearchIndex = () => {
  const { redisNoPipeline: redis } = useRedis()

  return useMutation({
    mutationFn: async (indexName: string) => {
      await redis.search.index({ name: indexName }).drop()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY] })
    },
  })
}
