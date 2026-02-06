import { InfiniteScroll } from "../../../common/infinite-scroll"
import { useKeys } from "../../hooks/use-keys"
import { Empty } from "./empty"
import { KeysList } from "./keys-list"
import { LoadingSkeleton } from "./skeleton-buttons"

export function Sidebar() {
  const { keys, query } = useKeys()

  return (
    <div className="flex h-full flex-col gap-2">
      {query.isLoading && keys.length === 0 ? (
        <LoadingSkeleton />
      ) : keys.length > 0 ? (
        // Infinite scroll already has a loader at the bottom
        <InfiniteScroll
          query={query}
          disableRoundedInherit
          className="min-h-0 rounded-xl bg-zinc-100 px-2 py-5 pr-4 dark:bg-zinc-200"
          scrollBarClassName="py-5"
        >
          <KeysList />
        </InfiniteScroll>
      ) : (
        <Empty />
      )}
    </div>
  )
}
