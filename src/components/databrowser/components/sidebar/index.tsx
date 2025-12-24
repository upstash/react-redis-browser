import { useKeys } from "../../hooks/use-keys"
import { Empty } from "./empty"
import { InfiniteScroll } from "./infinite-scroll"
import { KeysList } from "./keys-list"
import { LoadingSkeleton } from "./skeleton-buttons"

export function Sidebar() {
  const { keys, query } = useKeys()

  return (
    <div className="flex h-full flex-col gap-2 p-4">
      {query.isLoading && keys.length === 0 ? (
        <LoadingSkeleton />
      ) : keys.length > 0 ? (
        // Infinite scroll already has a loader at the bottom
        <InfiniteScroll query={query} disableRoundedInherit className="min-h-0">
          <KeysList />
        </InfiniteScroll>
      ) : (
        <Empty />
      )}
    </div>
  )
}
