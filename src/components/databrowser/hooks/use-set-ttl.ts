import { useRedis } from "@/redis-context"
import { useMutation } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { TTL_INFINITE } from "../components/display/ttl-badge"
import { FETCH_SIMPLE_KEY_QUERY_KEY } from "./use-fetch-simple-key"
import { FETCH_TTL_QUERY_KEY } from "./use-fetch-ttl"

export const useSetTTL = () => {
  const { redis } = useRedis()

  const updateTTL = useMutation({
    mutationFn: async ({ dataKey, ttl }: { dataKey: string; ttl?: number }) => {
      await (ttl === undefined || ttl === TTL_INFINITE
        ? redis.persist(dataKey)
        : redis.expire(dataKey, ttl))
    },
    onSuccess: (_, { dataKey }) => {
      queryClient.removeQueries({
        queryKey: [FETCH_TTL_QUERY_KEY, dataKey],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY, dataKey],
      })
    },
  })
  return updateTTL
}
