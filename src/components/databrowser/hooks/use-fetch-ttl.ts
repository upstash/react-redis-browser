import { useEffect } from "react"
import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { TTL_INFINITE, TTL_NOT_FOUND } from "../components/display/ttl-badge"
import { FETCH_SIMPLE_KEY_QUERY_KEY } from "./use-fetch-simple-key"

export const FETCH_TTL_QUERY_KEY = "fetch-ttl"

export const useFetchTTL = (dataKey: string) => {
  const { redis } = useRedis()

  const { isLoading, error, data } = useQuery({
    queryKey: [FETCH_TTL_QUERY_KEY, dataKey],
    queryFn: async () => {
      const ttl = await redis.ttl(dataKey)

      return ttl === TTL_INFINITE || ttl === TTL_NOT_FOUND ? ttl : Date.now() + ttl * 1000
    },
  })

  useEffect(() => {
    if (data === TTL_NOT_FOUND) {
      queryClient.invalidateQueries({
        queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY, dataKey],
      })
    }
  }, [data === TTL_NOT_FOUND])

  return { isLoading, error, data }
}
