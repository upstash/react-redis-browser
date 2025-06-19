import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

export const FETCH_KEY_TYPE_QUERY_KEY = "fetch-key-type"

export const useFetchKeyType = (key: string | undefined) => {
  const { redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_KEY_TYPE_QUERY_KEY, key],
    queryFn: async () => {
      if (!key) return "none"

      return await redis.type(key)
    },
  })
}
