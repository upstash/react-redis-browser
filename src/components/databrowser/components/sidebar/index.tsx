import { useTab } from "@/tab-provider"

import { InfiniteScroll } from "../../../common/infinite-scroll"
import { useKeys } from "../../hooks/use-keys"
import { Empty, FolderEmpty } from "./empty"
import { FolderBreadcrumb } from "./folder-breadcrumb"
import { KeysList } from "./keys-list"
import { KeepScanningSlot, ScanEmpty } from "./scan-status"
import { LoadingSkeleton } from "./skeleton-buttons"
import { FlatListBar, useShowViewToggle } from "./view-toggle"

export function Sidebar() {
  const { entries, query, scan, folderView } = useKeys()
  const { search } = useTab()
  const showViewToggle = useShowViewToggle()

  const inFolder =
    folderView.enabled &&
    (folderView.folder !== "" || search.key !== "" || search.type !== undefined)

  return (
    <div className="relative flex h-full flex-col gap-2">
      {folderView.enabled ? <FolderBreadcrumb /> : showViewToggle && <FlatListBar />}
      <div className="min-h-0 grow">
        {query.isLoading && entries.length === 0 ? (
          <LoadingSkeleton />
        ) : entries.length > 0 ? (
          // Infinite scroll already has a loader at the bottom
          <InfiniteScroll
            query={query}
            // Pause runaway auto-fetching when a sparse type filter stops matching;
            // the user resumes via the "keep scanning" slot.
            autoFetch={!scan.paused}
            endSlot={scan.paused ? <KeepScanningSlot /> : undefined}
            disableRoundedInherit
            className="browser-sidebar h-full min-h-0 rounded-xl bg-zinc-100 px-2 py-5 pr-4 dark:bg-zinc-200"
            scrollBarClassName="browser-sidebar-scrollbar py-5"
          >
            {/* A new list per folder, so shift click ranges do not carry over */}
            <KeysList
              key={`${folderView.enabled}:${folderView.folder}:${search.key}:${search.type}`}
            />
          </InfiniteScroll>
        ) : query.hasNextPage ? (
          // No matches yet, but keyspace remains (e.g. sparse type filter).
          <ScanEmpty />
        ) : inFolder ? (
          <FolderEmpty />
        ) : (
          <Empty />
        )}
      </div>
    </div>
  )
}
