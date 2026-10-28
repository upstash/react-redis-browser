import { useRedis } from "@/redis-context"
import type { ListDataType } from "@/types"
import { useMutation } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { useDeleteKeyCache } from "./use-delete-key-cache"
import { FETCH_HASH_FIELD_TTLS_QUERY_KEY } from "./use-fetch-hash-ttl"
import { FETCH_KEY_LENGTH_QUERY_KEY } from "./use-fetch-key-length"
import { FETCH_KEY_SIZE_QUERY_KEY } from "./use-fetch-key-size"
import { FETCH_LIST_ITEMS_QUERY_KEY, transformArray } from "./use-fetch-list-items"

export const useEditListItem = () => {
  const { redis } = useRedis()
  const { deleteKeyCache } = useDeleteKeyCache()

  return useMutation({
    mutationFn: async ({
      type,
      dataKey,
      itemKey,
      newKey,
      newValue,
      isNew,
    }: {
      type: ListDataType
      dataKey: string
      itemKey: string

      // If newKey is undefined, the item will be deleted
      newKey?: string
      newValue?: string

      // Only used for list data type, uses lpush if true
      isNew?: boolean
    }) => {
      if (
        newKey === "" &&
        (isNew || newKey !== itemKey) &&
        (type === "set" || type === "zset" || type === "hash")
      ) {
        throw new Error(`${type === "hash" ? "Field" : "Value"} cannot be empty`)
      }

      const pipe = redis.pipeline()
      const shouldDelete = !isNew && (newKey === undefined || newKey !== itemKey)

      switch (type) {
        case "set": {
          if (shouldDelete) {
            pipe.srem(dataKey, itemKey)
          }
          if (newKey !== undefined) {
            pipe.sadd(dataKey, newKey)
          }

          break
        }
        case "zset": {
          const score = parseScore(newValue)
          if (score === undefined && newKey !== undefined) {
            throw new TypeError("Score must be a number, inf or -inf")
          }

          if (shouldDelete) pipe.zrem(dataKey, itemKey)
          if (newKey !== undefined)
            pipe.zadd(dataKey, {
              member: newKey,
              // The SDK types scores as numbers but Redis also accepts "+inf" and "-inf"
              score: score as number,
            })

          break
        }
        case "hash": {
          if (shouldDelete) pipe.hdel(dataKey, itemKey)
          if (newKey !== undefined)
            pipe.hset(dataKey, {
              [newKey]: newValue,
            })

          break
        }
        case "list": {
          if (isNew) {
            pipe.lpush(dataKey, newValue)
          } else if (newKey === undefined) {
            // NOTE: This is how medis does, surprisingly there are no alternatives to this
            const uniqueKey = `__DELETED_${Date.now()}-${Math.random().toString(36).slice(7)}`
            pipe.lset(dataKey, Number(itemKey), uniqueKey)
            pipe.lrem(dataKey, 0, uniqueKey)
          } else {
            if (Number.isNaN(Number(itemKey)))
              throw new TypeError("Index must be a number for list data type")

            pipe.lset(dataKey, Number(itemKey), newValue)
          }

          break
        }
        case "stream": {
          if (!isNew || !newKey) throw new Error("Stream data type is not mutable")
          const opts = transformArray((newValue?.split("\n") ?? []).filter(Boolean)).map(
            ({ key, value }) => [key, value] as const
          )

          pipe.xadd(dataKey, newKey, Object.fromEntries(opts))

          break
        }
        default: {
          throw new Error(`Unsupported data type for editing: ${type}`)
        }
      }

      // Redis deletes the key when its last item is removed
      pipe.exists(dataKey)

      const results = await pipe.exec()
      return { keyExists: results.at(-1) === 1 }
    },
    onSuccess: ({ keyExists }, { dataKey }) => {
      if (!keyExists) deleteKeyCache(dataKey)

      queryClient.invalidateQueries({
        queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, dataKey],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_KEY_LENGTH_QUERY_KEY, dataKey],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_KEY_SIZE_QUERY_KEY, dataKey],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_HASH_FIELD_TTLS_QUERY_KEY, dataKey],
      })
    },
  })
}

/** Parses a zset score, returning Redis' "+inf"/"-inf" for infinite scores and undefined if invalid */
export const parseScore = (value?: string) => {
  const trimmed = value?.trim().toLowerCase()
  if (!trimmed) return
  if (/^\+?inf(inity)?$/.test(trimmed)) return "+inf"
  if (/^-inf(inity)?$/.test(trimmed)) return "-inf"
  if (!/^[+-]?(\d+\.?\d*|\.\d+)(e[+-]?\d+)?$/.test(trimmed)) return

  const score = Number(trimmed)
  return Number.isFinite(score) ? score : undefined
}
