import { IconRefresh } from "@tabler/icons-react"

import { queryClient } from "@/lib/clients"
import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

import { FETCH_LIST_ITEMS_QUERY_KEY, FETCH_SIMPLE_KEY_QUERY_KEY } from "../../hooks"
import { useKeys } from "../../hooks/use-keys"
import { AddKeyModal } from "../add-key-modal"
import { DisplayDbSize, FETCH_DB_SIZE_QUERY_KEY } from "./db-size"
import { Empty } from "./empty"
import { InfiniteScroll } from "./infinite-scroll"
import { KeysList } from "./keys-list"
import { SearchInput } from "./search-input"
import { LoadingSkeleton } from "./skeleton-buttons"
import { DataTypeSelector } from "./type-selector"

export function Sidebar() {
  const { keys, query, refetch } = useKeys()

  return (
    <div className="flex h-full flex-col gap-2 rounded-xl border bg-white p-1">
      <div className="rounded-lg bg-zinc-100 px-3 py-2">
        {/* Meta */}
        <div className="flex h-10 items-center justify-between pl-1">
          <DisplayDbSize />
          <div className="flex gap-1">
            <Button
              className="h-7 w-7 px-0"
              onClick={() => {
                refetch()
                queryClient.invalidateQueries({
                  queryKey: [FETCH_LIST_ITEMS_QUERY_KEY],
                })
                queryClient.invalidateQueries({
                  queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY],
                })
                queryClient.invalidateQueries({
                  queryKey: [FETCH_DB_SIZE_QUERY_KEY],
                })
              }}
            >
              <Spinner isLoading={query.isFetching}>
                <IconRefresh size={16} />
              </Spinner>
            </Button>
            <AddKeyModal />
          </div>
        </div>

        {/* Filter */}
        <div className="flex h-10 items-center">
          {/* Types */}
          <DataTypeSelector />

          {/* Search */}
          <SearchInput />
        </div>
      </div>

      {query.isLoading ? (
        <LoadingSkeleton />
      ) : keys.length > 0 ? (
        <InfiniteScroll query={query}>
          <KeysList />
        </InfiniteScroll>
      ) : (
        <Empty />
      )}
    </div>
  )
}
