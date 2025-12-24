import { Skeleton } from "@/components/ui/skeleton"

import { useFetchKeyType } from "../hooks/use-fetch-key-type"
import { TypeTag } from "./type-tag"

export function TabTypeIcon({ selectedKey }: { selectedKey: string | undefined }) {
  const { data: keyType, isLoading } = useFetchKeyType(selectedKey)

  if (isLoading) return <Skeleton className="h-5 w-5 rounded" />

  if (!keyType || keyType === "none") return

  return <TypeTag variant={keyType} type="icon" />
}
