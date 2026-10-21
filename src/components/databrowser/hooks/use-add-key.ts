import { useRedis } from "@/redis-context"
import type { SearchFilter, ValuesSearchFilter } from "@/store"
import type { DataType, RedisKey } from "@/types"
import { useMutation, type InfiniteData, type QueryClient } from "@tanstack/react-query"
import type { Redis } from "@upstash/redis"

import { queryClient } from "@/lib/clients"
import { matchesGlob } from "@/lib/utils"

import { FETCH_KEY_TYPE_QUERY_KEY } from "./use-fetch-key-type"
import { FETCH_SEARCH_INDEX_QUERY_KEY, type SearchIndex } from "./use-fetch-search-index"
import { FETCH_KEYS_QUERY_KEY } from "./use-keys"

// Reads the query key of a key list, see KeysProvider
const parseKeysQueryKey = (queryKey: readonly unknown[]) => {
  const [, search, valuesSearch, isValuesSearchSelected] = queryKey as [
    string,
    SearchFilter,
    ValuesSearchFilter,
    boolean,
  ]
  return { search, valuesSearch, isValuesSearchSelected }
}

/** Whether a key scan with these filters lists a key of this type */
export const keyScanMatches = (search: SearchFilter, key: string, type: DataType) =>
  (!search.type || search.type === type) && (!search.key || matchesGlob(search.key, key))

/** Whether the index can contain the key; assumes it can when the index details are unknown */
export const indexMayContainKey = (index: SearchIndex | undefined, key: string, type: DataType) =>
  !index ||
  (index.dataType === type &&
    (index.prefixes.length === 0 || index.prefixes.some((prefix) => key.startsWith(prefix))))

/**
 * Adds a new key to the cached key scans whose filters it matches, and refetches the value
 * searches of the indexes that can contain it once the key is indexed, since only the search
 * can tell whether the query matches it.
 */
export const updateCacheAfterAddKey = ({
  client,
  redis,
  key,
  type,
}: {
  client: QueryClient
  redis: Redis
  key: string
  type: DataType
}) => {
  // Lets the new key be displayed even when it is not in the current list
  client.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, key], type)

  client.setQueriesData<
    InfiniteData<{
      keys: RedisKey[]
      hasNextPage: boolean
    }>
  >(
    {
      queryKey: [FETCH_KEYS_QUERY_KEY],
      predicate: ({ queryKey }) => {
        const { search, isValuesSearchSelected } = parseKeysQueryKey(queryKey)
        return !isValuesSearchSelected && keyScanMatches(search, key, type)
      },
    },
    (data) => {
      if (!data) return
      return {
        ...data,
        pages: data.pages.map((page, i) =>
          i === 0 ? { ...page, keys: [[key, type] as RedisKey, ...page.keys] } : page
        ),
      }
    }
  )

  const indexes = new Set<string>()
  for (const query of client.getQueryCache().findAll({ queryKey: [FETCH_KEYS_QUERY_KEY] })) {
    const { valuesSearch, isValuesSearchSelected } = parseKeysQueryKey(query.queryKey)
    if (isValuesSearchSelected && valuesSearch.index) indexes.add(valuesSearch.index)
  }

  for (const index of indexes) {
    const details = client.getQueryData<SearchIndex>([FETCH_SEARCH_INDEX_QUERY_KEY, index])
    if (!indexMayContainKey(details, key, type)) continue

    const refetchResults = () =>
      client.invalidateQueries({
        queryKey: [FETCH_KEYS_QUERY_KEY],
        predicate: ({ queryKey }) => {
          const { valuesSearch, isValuesSearchSelected } = parseKeysQueryKey(queryKey)
          return isValuesSearchSelected && valuesSearch.index === index
        },
      })
    // Refetch even if waiting fails, so the results are refreshed either way
    void redis.search.index({ name: index }).waitIndexing().then(refetchResults, refetchResults)
  }
}

export const useAddKey = () => {
  const { redis, redisNoPipeline } = useRedis()

  const mutation = useMutation({
    mutationFn: async ({ key, type }: { key: string; type: DataType }) => {
      if (await redis.exists(key)) throw new Error(`Key "${key}" already exists`)

      switch (type) {
        case "set": {
          await redis.sadd(key, "value")
          break
        }
        case "zset": {
          await redis.zadd(key, {
            member: "value",
            score: 0,
          })
          break
        }
        case "hash": {
          await redis.hset(key, {
            field: "value",
          })
          break
        }
        case "list": {
          await redis.lpush(key, "value")
          break
        }
        case "stream": {
          await redis.xadd(key, "*", {
            foo: "bar",
          })
          break
        }
        case "string": {
          await redis.set(key, "value")
          break
        }
        case "json": {
          await redis.json.set(key, "$", {
            foo: "bar",
          })
          break
        }
        default: {
          throw new Error(`Invalid type provided to useAddKey: "${type}"`)
        }
      }
    },
    onSuccess: (_, { key, type }) => {
      updateCacheAfterAddKey({ client: queryClient, redis: redisNoPipeline, key, type })
    },
  })
  return mutation
}
