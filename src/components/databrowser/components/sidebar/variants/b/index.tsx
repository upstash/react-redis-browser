import { useTab } from "@/tab-provider"

import { cn } from "@/lib/utils"

import { InfiniteScroll } from "../../../../../common/infinite-scroll"
import { useKeys } from "../../../../hooks/use-keys"
import { Empty, FolderEmpty } from "../../empty"
import { KeysList } from "../../keys-list"
import { KeepScanningSlot, ScanEmpty } from "../../scan-status"
import { LoadingSkeleton } from "../../skeleton-buttons"
import { FolderBreadcrumb } from "./folder-breadcrumb"
import { useShowViewToggle, ViewTabs } from "./view-toggle"

export function SidebarVariant() {
  const { entries, query, scan, folderView } = useKeys()
  const { search } = useTab()
  const showViewToggle = useShowViewToggle()

  const inFolder =
    folderView.enabled &&
    (folderView.folder !== "" || search.key !== "" || search.type !== undefined)

  // In folder view the path is the header of the list panel
  const withPath = folderView.enabled

  return (
    <div className="relative flex h-full flex-col gap-2">
      {showViewToggle && <ViewTabs />}
      <div
        className={cn(
          "flex min-h-0 grow flex-col",
          withPath && "rounded-xl bg-zinc-100 dark:bg-zinc-200"
        )}
      >
        {withPath && <FolderBreadcrumb />}
        <div className={cn("min-h-0 grow", withPath && entries.length === 0 && "p-1.5")}>
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
              className={cn(
                "browser-sidebar h-full min-h-0 rounded-xl bg-zinc-100 px-2 pr-4 dark:bg-zinc-200",
                withPath ? "rounded-t-none pb-5 pt-1.5" : "py-5"
              )}
              scrollBarClassName={cn(
                "browser-sidebar-scrollbar",
                withPath ? "pb-5 pt-1.5" : "py-5"
              )}
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
    </div>
  )
}
