import { useRedis } from "@/redis-context"
import type { SearchFilter } from "@/store"
import type { DataType, RedisKey } from "@/types"
import { useMutation, type InfiniteData } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import { matchesGlob } from "@/lib/utils"

import { FETCH_KEY_TYPE_QUERY_KEY } from "./use-fetch-key-type"
import { FETCH_KEYS_QUERY_KEY } from "./use-keys"

export const useAddKey = () => {
  const { redis } = useRedis()

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
      // Lets the new key be displayed even when it is not in the current list
      queryClient.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, key], type)

      queryClient.setQueriesData<
        InfiniteData<{
          keys: RedisKey[]
          hasNextPage: boolean
        }>
      >(
        {
          queryKey: [FETCH_KEYS_QUERY_KEY],
          // Only add the key to key scans whose filters it matches, never to value searches
          predicate: ({ queryKey }) => {
            const [, search, , isValuesSearchSelected] = queryKey as [
              string,
              SearchFilter,
              unknown,
              boolean,
            ]
            return (
              !isValuesSearchSelected &&
              (!search.type || search.type === type) &&
              (!search.key || matchesGlob(search.key, key))
            )
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
    },
  })
  return mutation
}
