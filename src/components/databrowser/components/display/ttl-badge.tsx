import { useEffect, useState } from "react"
import { IconChevronDown } from "@tabler/icons-react"

import { formatTime } from "@/lib/utils"
import { Skeleton } from "@/components/ui/skeleton"

import { Badge } from "./header-badges"
import { TTLPopover } from "./ttl-popover"

export const TTL_INFINITE = -1
export const TTL_NOT_FOUND = -2

export const calculateTTL = (expireAt?: number) => {
  if (!expireAt) return
  if (expireAt === TTL_INFINITE) return TTL_INFINITE
  return Math.max(0, Math.floor((expireAt - Date.now()) / 1000))
}

export const TTLBadge = ({
  label = "TTL:",
  expireAt,
  setTTL,
  isPending,
}: {
  label?: string
  expireAt?: number
  setTTL: (ttl: number) => void
  isPending: boolean
}) => {
  const [ttl, setTTLLabel] = useState(() => calculateTTL(expireAt))

  // Update ttl every second
  useEffect(() => {
    setTTLLabel(calculateTTL(expireAt))
    const interval = setInterval(() => {
      setTTLLabel(calculateTTL(expireAt))
    }, 1000)

    return () => clearInterval(interval)
  }, [expireAt])

  return (
    <Badge label={label}>
      {ttl === undefined ? (
        <Skeleton className="ml-1 h-3 w-10 rounded-md opacity-50" />
      ) : (
        <TTLPopover ttl={ttl} setTTL={setTTL} isPending={isPending}>
          <div className="flex items-center gap-[2px]">
            {ttl === TTL_INFINITE ? "No" : formatTime(ttl)}
            <IconChevronDown className="shrink-0 text-zinc-400" size={16} />
          </div>
        </TTLPopover>
      )}
    </Badge>
  )
}
