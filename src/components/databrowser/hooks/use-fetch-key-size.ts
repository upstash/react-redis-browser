import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

const FETCH_KEY_SIZE_QUERY_KEY = "fetch-key-size"

export const useFetchKeySize = (dataKey: string) => {
  const { redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_KEY_SIZE_QUERY_KEY, dataKey],
    queryFn: async () => {
      return (await redis.eval(`return redis.call("MEMORY", "USAGE", KEYS[1])`, [dataKey], [])) as
        | number
        | null
    },
  })
}
