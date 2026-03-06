import { useRedis } from "@/redis-context"
import { useInfiniteQuery } from "@tanstack/react-query"

import { listSearchIndexes } from "@/lib/list-search-indexes"

export const FETCH_SEARCH_INDEXES_QUERY_KEY = "fetch-search-indexes"

const PAGE_SIZE = 30

export const useFetchSearchIndexes = ({
  match,
  enabled,
}: { match?: string; enabled?: boolean } = {}) => {
  const { redisNoPipeline: redis } = useRedis()

  const query = useInfiniteQuery({
    queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY, match],
    enabled: enabled ?? true,
    initialPageParam: 0,
    queryFn: async ({ pageParam: offset }) => {
      const names = await listSearchIndexes(redis, { match, limit: PAGE_SIZE, offset })
      return {
        names,
        nextOffset: names.length >= PAGE_SIZE ? offset + names.length : undefined,
      }
    },
    getNextPageParam: (lastPage) => lastPage.nextOffset,
  })

  const indexes = query.data?.pages.flatMap((page) => page.names)

  return {
    data: indexes,
    isLoading: query.isLoading || (query.isFetching && !query.isFetchingNextPage),
    hasNextPage: query.hasNextPage,
    fetchNextPage: query.fetchNextPage,
    isFetchingNextPage: query.isFetchingNextPage,
  }
}
