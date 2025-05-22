import { useRedis } from "@/redis-context"
import { useQuery } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { TTL_INFINITE, TTL_NOT_FOUND } from "../components/display/ttl-badge"

export const FETCH_HASH_FIELD_TTLS_QUERY_KEY = "fetch-hash-field-ttls"

// Returns expireAt instead of ttl seconds, its more useful for the UI
export const useFetchHashFieldExpires = ({
  dataKey,
  fields,
}: {
  dataKey: string
  fields: string[]
}) => {
  const { redis } = useRedis()

  return useQuery({
    queryKey: [FETCH_HASH_FIELD_TTLS_QUERY_KEY, dataKey, fields],
    queryFn: async () => {
      const cachedExpires = new Map<string, number | undefined>()

      // Collect already cached results from query cache
      for (const field of fields) {
        const expireAt = queryClient.getQueryData([
          FETCH_HASH_FIELD_TTLS_QUERY_KEY,
          dataKey,
          field,
        ]) as number | undefined
        if (expireAt !== undefined) cachedExpires.set(field, expireAt)
      }

      // Filter out fields that are already cached
      const filteredFields = fields.filter((field) => !cachedExpires.has(field))

      // If all fields are cached, return cached expires
      if (filteredFields.length === 0) return Object.fromEntries(cachedExpires.entries())

      const res = await redis.httl(dataKey, filteredFields)
      const expireAts = res.map((ttl) =>
        ttl === TTL_INFINITE || ttl === TTL_NOT_FOUND ? ttl : Date.now() + ttl * 1000
      )

      // Set new ttls
      for (const [i, field] of filteredFields.entries()) {
        queryClient.setQueryData([FETCH_HASH_FIELD_TTLS_QUERY_KEY, dataKey, field], expireAts[i])
      }

      const newExpiresArray = expireAts.map((expireAt, i) => [filteredFields[i], expireAt])

      // Return all, both cached and new
      return Object.fromEntries([...cachedExpires.entries(), ...newExpiresArray]) as Record<
        string,
        number | undefined
      >
    },
  })
}
