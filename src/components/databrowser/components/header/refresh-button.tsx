import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import { useMutation } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import { ReloadButton } from "@/components/common/reload-button"

import {
  FETCH_KEYS_QUERY_KEY,
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  useKeys,
} from "../../hooks"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"

const invalidateAll = () => {
  queryClient.invalidateQueries({ queryKey: [FETCH_KEYS_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [FETCH_LIST_ITEMS_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY] })
  queryClient.invalidateQueries({ queryKey: [FETCH_KEY_TYPE_QUERY_KEY] })
}

export const RefreshButton = () => {
  const { query } = useKeys()
  const { isValuesSearchSelected, valuesSearch } = useTab()
  const { redisNoPipeline: redis } = useRedis()

  const reindex = useMutation({
    mutationFn: async () => {
      if (isValuesSearchSelected && valuesSearch.index) {
        await redis.search.index({ name: valuesSearch.index }).waitIndexing()
      }
    },
    onSettled: invalidateAll,
  })

  return (
    <ReloadButton
      onClick={() => reindex.mutate()}
      isLoading={query.isFetching || reindex.isPending}
      tooltip={isValuesSearchSelected ? "Reindex & Refresh Query" : "Refresh Scan"}
    />
  )
}
