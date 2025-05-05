import { useEffect, useState } from "react"

import { formatTime } from "@/lib/utils"
import { useFetchHashFieldExpires } from "@/components/databrowser/hooks/use-fetch-hash-ttl"

import { calculateTTL, TTL_INFINITE, TTL_NOT_FOUND } from "../ttl-badge"

export const HashFieldTTLInfo = ({
  dataKey,
  field,
  fields,
}: {
  dataKey: string
  field: string
  fields: string[]
}) => {
  const { data } = useFetchHashFieldExpires({ dataKey, fields })
  const expireAt = data?.[field]

  const [ttl, setTTL] = useState(() => calculateTTL(expireAt))

  useEffect(() => {
    setTTL(calculateTTL(expireAt))
    const interval = setInterval(() => {
      setTTL(calculateTTL(expireAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [expireAt])

  if (!expireAt || expireAt === TTL_NOT_FOUND || expireAt === TTL_INFINITE) return

  return (
    <span className="block min-w-[30px] whitespace-nowrap text-red-600">
      {formatTime(ttl ?? 0)}
    </span>
  )
}
