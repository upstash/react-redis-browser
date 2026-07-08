import { useTab } from "@/tab-provider"
import { IconLoader2 } from "@tabler/icons-react"

import { useKeys } from "../../hooks/use-keys"

const formatScanned = (n: number) => {
  if (n >= 1_000_000) return `~${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1000) return `~${(n / 1000).toFixed(1)}K`
  return `${n}`
}

const ScanMessage = () => {
  const { scan } = useKeys()
  const { search } = useTab()
  const typeLabel = search.type ? `${search.type} ` : ""

  return (
    <p className="text-balance text-sm text-zinc-500">
      No {typeLabel}keys found in the first {formatScanned(scan.scannedKeys)} keys scanned.
    </p>
  )
}

const KeepScanningButton = () => {
  const { query } = useKeys()

  return (
    <button
      onClick={() => query.fetchNextPage()}
      disabled={query.isFetchingNextPage}
      className="inline-flex items-center gap-1.5 rounded-lg border border-zinc-300 bg-white px-3 py-1.5 text-sm font-medium text-zinc-700 transition-colors hover:bg-zinc-50 disabled:opacity-60"
    >
      {query.isFetchingNextPage && <IconLoader2 className="size-4 animate-spin" />}
      {query.isFetchingNextPage ? "Scanning…" : "Keep scanning"}
    </button>
  )
}

/**
 * Sidebar body state when a type filter has matched nothing yet but there is
 * still keyspace left to scan. Replaces the infinite SCAN loop with an explicit,
 * user-driven continue.
 */
export const ScanEmpty = () => (
  <div className="flex h-full w-full items-center justify-center rounded-md border bg-white px-4 py-6 text-center">
    <div className="flex flex-col items-center gap-4">
      <ScanMessage />
      <KeepScanningButton />
    </div>
  </div>
)

/** Bottom-of-list slot when some matches are shown but auto-scan has paused. */
export const KeepScanningSlot = () => (
  <div className="flex flex-col items-center gap-2">
    <ScanMessage />
    <KeepScanningButton />
  </div>
)
