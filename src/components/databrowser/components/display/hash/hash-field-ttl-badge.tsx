import { useFetchHashFieldExpires } from "@/components/databrowser/hooks/use-fetch-hash-ttl"
import { useSetHashTTL } from "@/components/databrowser/hooks/use-set-hash-ttl"

import { TTLBadge } from "../ttl-badge"

export const HashFieldTTLBadge = ({ dataKey, field }: { dataKey: string; field: string }) => {
  const { data } = useFetchHashFieldExpires({ dataKey, fields: [field] })
  const { mutate: setTTL, isPending } = useSetHashTTL()

  const expireAt = data?.[field]

  return (
    <TTLBadge
      label="Field TTL:"
      expireAt={expireAt}
      setTTL={(ttl) => setTTL({ dataKey, field, ttl })}
      isPending={isPending}
    />
  )
}
