import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import { useMutation, type Query, type QueryClient } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import { ReloadButton } from "@/components/common/reload-button"

import {
  FETCH_KEYS_QUERY_KEY,
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  FETCH_TTL_QUERY_KEY,
  useKeys,
} from "../../hooks"
import { FETCH_KEY_LENGTH_QUERY_KEY } from "../../hooks/use-fetch-key-length"
import { FETCH_KEY_SIZE_QUERY_KEY } from "../../hooks/use-fetch-key-size"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"

// Queries keyed by [prefix, key, type] whose command depends on the key type
const TYPE_DEPENDENT_QUERY_KEYS = [
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  FETCH_KEY_LENGTH_QUERY_KEY,
]

export const invalidateAll = async (client: QueryClient = queryClient) => {
  // The scan and the type queries write the fresh key types into the type cache
  await Promise.all(
    [
      FETCH_KEYS_QUERY_KEY,
      FETCH_KEY_TYPE_QUERY_KEY,
      FETCH_TTL_QUERY_KEY,
      FETCH_KEY_SIZE_QUERY_KEY,
    ].map((prefix) => client.invalidateQueries({ queryKey: [prefix] }))
  )

  // Refetching a query under a stale type would run the wrong command (e.g. SCARD on a hash)
  // and fail with WRONGTYPE. Only refetch queries whose type is still current; the rest are
  // replaced by the query keyed with the new type once the view rerenders.
  const typeIsCurrent = (query: Query) => {
    const [, key, type] = query.queryKey
    return client.getQueryData([FETCH_KEY_TYPE_QUERY_KEY, key]) === type
  }

  await Promise.all(
    TYPE_DEPENDENT_QUERY_KEYS.map(async (prefix) => {
      await client.invalidateQueries({ queryKey: [prefix], refetchType: "none" })
      await client.refetchQueries({ queryKey: [prefix], type: "active", predicate: typeIsCurrent })
    })
  )
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
    onSettled: () => invalidateAll(),
  })

  return (
    <ReloadButton
      onClick={() => reindex.mutate()}
      isLoading={query.isFetching || reindex.isPending}
      tooltip={isValuesSearchSelected ? "Reindex & Refresh Query" : "Refresh Scan"}
    />
  )
}
