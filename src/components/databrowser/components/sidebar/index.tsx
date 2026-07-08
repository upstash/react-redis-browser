import { InfiniteScroll } from "../../../common/infinite-scroll"
import { useKeys } from "../../hooks/use-keys"
import { Empty } from "./empty"
import { KeysList } from "./keys-list"
import { KeepScanningSlot, ScanEmpty } from "./scan-status"
import { LoadingSkeleton } from "./skeleton-buttons"

export function Sidebar() {
  const { keys, query, scan } = useKeys()

  return (
    <div className="relative flex h-full flex-col gap-2">
      {query.isLoading && keys.length === 0 ? (
        <LoadingSkeleton />
      ) : keys.length > 0 ? (
        // Infinite scroll already has a loader at the bottom
        <InfiniteScroll
          query={query}
          // Pause runaway auto-fetching when a sparse type filter stops matching;
          // the user resumes via the "keep scanning" slot.
          autoFetch={!scan.paused}
          endSlot={scan.paused ? <KeepScanningSlot /> : undefined}
          disableRoundedInherit
          className="h-full min-h-0 rounded-xl bg-zinc-100 px-2 py-5 pr-4 dark:bg-zinc-200"
          scrollBarClassName="py-5"
        >
          <KeysList />
        </InfiniteScroll>
      ) : query.hasNextPage ? (
        // No matches yet, but keyspace remains (e.g. sparse type filter).
        <ScanEmpty />
      ) : (
        <Empty />
      )}
    </div>
  )
}
