import { useDatabrowser } from "@/store"
import { useMutation } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { TTL_INFINITE } from "../components/display/ttl-badge"
import { FETCH_HASH_FIELD_TTLS_QUERY_KEY } from "./use-fetch-hash-ttl"

export const useSetHashTTL = () => {
  const { redis } = useDatabrowser()

  return useMutation({
    mutationFn: async ({
      dataKey,
      field,
      ttl,
    }: {
      dataKey: string
      field: string
      ttl: number
    }) => {
      await (ttl === undefined || ttl === TTL_INFINITE
        ? redis.hpersist(dataKey, field)
        : redis.hexpire(dataKey, field, ttl))
    },
    onSuccess: (_, { dataKey }) => {
      queryClient.removeQueries({
        queryKey: [FETCH_HASH_FIELD_TTLS_QUERY_KEY, dataKey],
      })
    },
  })
}
