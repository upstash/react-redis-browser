import { useRedis } from "@/redis-context"
import type { DataType } from "@/types"
import { useMutation, type InfiniteData } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import type { KeyListEntry } from "@/lib/folders"

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
      for (const query of queryClient.getQueryCache().findAll({
        queryKey: [FETCH_KEYS_QUERY_KEY],
      })) {
        // The folder view lists the key under its folder, which only a new scan can tell
        if (query.queryKey[4]) {
          queryClient.invalidateQueries({ queryKey: query.queryKey, exact: true })
          continue
        }

        queryClient.setQueryData<
          InfiniteData<{
            entries: KeyListEntry[]
            hasNextPage: boolean
          }>
        >(query.queryKey, (data) => {
          if (!data) return
          return {
            ...data,
            pages: data.pages.map((page, i) =>
              i === 0 ? { ...page, entries: [{ kind: "key", key, type }, ...page.entries] } : page
            ),
          }
        })
      }
    },
  })
  return mutation
}
