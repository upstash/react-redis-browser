import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

const FETCH_KEY_SIZE_QUERY_KEY = "fetch-key-size"

export const useFetchKeySize = (dataKey: string) => {
  const { redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_KEY_SIZE_QUERY_KEY, dataKey],
    queryFn: async () => {
      return await redis.exec<number | undefined>(["MEMORY", "USAGE", dataKey])
    },
  })
}
