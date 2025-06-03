import { useRedis } from "@/redis-context"
import type { DataType } from "@/types"
import { useQuery } from "@tanstack/react-query"

import { useDeleteKeyCache } from "./use-delete-key-cache"

export const FETCH_SIMPLE_KEY_QUERY_KEY = "fetch-simple-key"

/** Simple key standing for string or json */
export const useFetchSimpleKey = (dataKey: string, type: DataType) => {
  const { redisNoPipeline: redis } = useRedis()
  const { deleteKeyCache } = useDeleteKeyCache()

  return useQuery({
    queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY, dataKey],
    queryFn: async () => {
      let result
      if (type === "string") result = (await redis.get(dataKey)) as string | null
      else if (type === "json") result = (await redis.json.get(dataKey)) as string | null
      else throw new Error(`Invalid type when fetching simple key: ${type}`)

      if (type === "json" && result !== null)
        result = JSON.stringify(sortObject(JSON.parse(result)))

      if (result === null) deleteKeyCache(dataKey)

      return result
    },
  })
}

// Add recursive key sorting to a JSON object
const sortObject = (obj: unknown): unknown => {
  if (typeof obj !== "object" || obj === null) return obj
  return Object.fromEntries(
    Object.entries(obj)
      .sort((a, b) => a[0].localeCompare(b[0]))
      .map(([key, value]) =>
        typeof value === "object" && !Array.isArray(value) && value !== null
          ? [key, sortObject(value)]
          : [key, value]
      )
  )
}
