import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

export const FETCH_KEY_TYPE_QUERY_KEY = "fetch-key-type"

export const useFetchKeyType = (key: string | undefined, { enabled = true } = {}) => {
  const { redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_KEY_TYPE_QUERY_KEY, key],
    enabled,
    queryFn: async () => {
      if (key === undefined) return "none"

      return await redis.type(key)
    },
  })
}
