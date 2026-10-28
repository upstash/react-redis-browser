import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import { useMutation, type Query, type QueryClient } from "@tanstack/react-query"
import type { Redis } from "@upstash/redis"

import { queryClient } from "@/lib/clients"
import { ReloadButton } from "@/components/common/reload-button"

import {
  FETCH_KEYS_QUERY_KEY,
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  FETCH_TTL_QUERY_KEY,
  useKeys,
} from "../../hooks"
import { FETCH_HASH_FIELD_TTLS_QUERY_KEY } from "../../hooks/use-fetch-hash-ttl"
import { FETCH_KEY_LENGTH_QUERY_KEY } from "../../hooks/use-fetch-key-length"
import { FETCH_KEY_SIZE_QUERY_KEY } from "../../hooks/use-fetch-key-size"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"

// Queries keyed by [prefix, key, type] whose command depends on the key type
const TYPE_DEPENDENT_QUERY_KEYS = new Set([
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  FETCH_KEY_LENGTH_QUERY_KEY,
])

const isTypeDependent = (query: Query) => TYPE_DEPENDENT_QUERY_KEYS.has(query.queryKey[0] as string)

// Keyed by [prefix, key, ...] and only valid for hashes
const isHashFieldTtls = (query: Query) => query.queryKey[0] === FETCH_HASH_FIELD_TTLS_QUERY_KEY

export const invalidateAll = async (
  redis: Pick<Redis, "type">,
  client: QueryClient = queryClient
) => {
  // Started first so the type fetches below join the in-flight type refetches instead of
  // being cancelled by them
  const typeIndependent = Promise.all(
    [
      FETCH_KEYS_QUERY_KEY,
      FETCH_KEY_TYPE_QUERY_KEY,
      FETCH_TTL_QUERY_KEY,
      FETCH_KEY_SIZE_QUERY_KEY,
    ].map((prefix) => client.invalidateQueries({ queryKey: [prefix] }))
  )

  // Read the current type of every key shown with a type dependent query. The scan can't be
  // trusted for this: it leaves out keys that no longer match the search or type filter.
  const keys = new Set(
    client
      .getQueryCache()
      .findAll({ type: "active", predicate: isTypeDependent })
      .map((query) => query.queryKey[1] as string)
  )
  const typesPromise = Promise.all(
    [...keys].map(async (key) => {
      try {
        const type = await client.fetchQuery({
          queryKey: [FETCH_KEY_TYPE_QUERY_KEY, key],
          queryFn: () => redis.type(key),
          staleTime: 0,
        })
        return [key, type] as const
      } catch {
        return [key, undefined] as const
      }
    })
  )

  // Refetching a query under a stale type would run the wrong command (e.g. SCARD on a hash)
  // and fail with WRONGTYPE. Only refetch queries whose type is still current; the rest are
  // replaced by the query keyed with the new type once the scan updates the view.
  const types = new Map(await typesPromise)
  const typeIsCurrent = (query: Query) => {
    const [, key, type] = query.queryKey
    return types.get(key as string) === type
  }
  const isStillHash = (query: Query) => types.get(query.queryKey[1] as string) === "hash"

  await client.invalidateQueries({
    predicate: (query) => isTypeDependent(query) || isHashFieldTtls(query),
    refetchType: "none",
  })
  await Promise.all([
    typeIndependent,
    client.refetchQueries({
      type: "active",
      predicate: (query) =>
        (isTypeDependent(query) && typeIsCurrent(query)) ||
        (isHashFieldTtls(query) && isStillHash(query)),
    }),
  ])
}

export const RefreshButton = () => {
  const { query } = useKeys()
  const { isValuesSearchSelected, valuesSearch } = useTab()
  const { redis: pipelinedRedis, redisNoPipeline: redis } = useRedis()

  const reindex = useMutation({
    mutationFn: async () => {
      if (isValuesSearchSelected && valuesSearch.index) {
        await redis.search.index({ name: valuesSearch.index }).waitIndexing()
      }
    },
    onSettled: () => invalidateAll(pipelinedRedis),
  })

  return (
    <ReloadButton
      onClick={() => reindex.mutate()}
      isLoading={query.isFetching || reindex.isPending}
      tooltip={isValuesSearchSelected ? "Reindex & Refresh Query" : "Refresh Scan"}
    />
  )
}
