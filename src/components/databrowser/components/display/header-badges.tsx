import { type DataType } from "@/types"
import bytes from "bytes"

import { Skeleton } from "@/components/ui/skeleton"

import { useFetchTTL, useSetTTL } from "../../hooks"
import { useFetchKeyLength } from "../../hooks/use-fetch-key-length"
import { useFetchKeySize } from "../../hooks/use-fetch-key-size"
import { TTLBadge } from "./ttl-badge"

export const LengthBadge = ({
  dataKey,
  type,
  content,
}: {
  dataKey: string
  type: DataType
  content?: string
}) => {
  const { data, isLoading } = useFetchKeyLength({ dataKey, type })

  // If the type is a simple type, the length is the size of the content
  const length = content?.length ?? data

  return (
    <Badge label="Length:">
      {isLoading ? <Skeleton className="ml-1 h-3 w-10 rounded-md opacity-50" /> : length}
    </Badge>
  )
}

export const SizeBadge = ({ dataKey }: { dataKey: string }) => {
  const { data: size } = useFetchKeySize(dataKey)

  return (
    <Badge label="Size:">
      {size === undefined || size === null ? (
        <Skeleton className="ml-1 h-3 w-10 rounded-md opacity-50" />
      ) : (
        bytes(size, {
          unitSeparator: " ",
        })
      )}
    </Badge>
  )
}

export const HeaderTTLBadge = ({ dataKey }: { dataKey: string }) => {
  const { data: expireAt } = useFetchTTL(dataKey)
  const { mutate: setTTL, isPending } = useSetTTL()

  return (
    <TTLBadge
      expireAt={expireAt}
      setTTL={(ttl) => setTTL({ dataKey, ttl })}
      isPending={isPending}
    />
  )
}

export const Badge = ({ children, label }: { children: React.ReactNode; label: string }) => (
  <div className="flex h-[26px] items-center gap-0.5 whitespace-nowrap rounded-md bg-zinc-200 px-2 text-xs text-zinc-700 dark:bg-zinc-200">
    <span className="text-zinc-500 dark:text-zinc-500">{label}</span>
    <span className="font-medium">{children}</span>
  </div>
)
