import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

import { scanKeys } from "@/lib/scan-keys"

export const FETCH_SEARCH_INDEXES_QUERY_KEY = "fetch-search-indexes"

export const useFetchSearchIndexes = ({
  match,
  enabled,
}: { match?: string; enabled?: boolean } = {}) => {
  const { redisNoPipeline: redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
    enabled: enabled ?? true,
    queryFn: () => scanKeys(redis, { match, type: "search" }),
  })
}
