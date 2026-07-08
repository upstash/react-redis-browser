import { useEffect, useState } from "react"
import { useTab } from "@/tab-provider"
import {
  IconChevronDown,
  IconCircleCheck,
  IconCirclePlus,
  IconLoader2,
  IconSearch,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Segmented } from "@/components/ui/segmented"

import type { TabType } from "../.."
import { useDebounce } from "../../hooks/use-debounce"
import { useFetchSearchIndexes } from "../../hooks/use-fetch-search-indexes"
import { AddKeyModal } from "../add-key-modal"
import { AddIndexKeyButton } from "../search/add-index-key-modal"
import { CreateIndexModal } from "../search/create-index-modal"
import { EditIndexModal } from "../search/edit-index-modal"
import { ExportResultsButton } from "../search/export-results-button"
import { IndexActionsMenu } from "../search/index-actions-menu"
import { RefreshButton } from "./refresh-button"
import { SearchInput } from "./search-input"
import { DataTypeSelector } from "./type-selector"

export const Header = ({ tabType, allowSearch }: { tabType: TabType; allowSearch: boolean }) => {
  const { isValuesSearchSelected, setIsValuesSearchSelected } = useTab()

  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex grow items-center gap-1.5">
        {tabType === "all" && (
          <Segmented
            options={[
              {
                key: "keys",
                label: "Keys",
              },
              {
                key: "values",
                label: "Search",
              },
            ]}
            value={isValuesSearchSelected ? "values" : "keys"}
            onChange={(value) => {
              setIsValuesSearchSelected(value === "values")
            }}
            className="bg-emerald-800"
            unselectedClassName="text-emerald-100"
            selectedClassName="bg-emerald-50 text-emerald-800"
          />
        )}
        {isValuesSearchSelected ? (
          <>
            <IndexSelector />
            <IndexActionsMenu />
          </>
        ) : (
          <>
            <DataTypeSelector allowSearch={allowSearch} />
            <SearchInput />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <RefreshButton />
        {isValuesSearchSelected && <ExportResultsButton />}
        {isValuesSearchSelected ? <AddIndexKeyButton /> : <AddKeyModal />}
      </div>
    </div>
  )
}

const IndexSelector = () => {
  const {
    valuesSearch: { index },
    setValuesSearchIndex,
  } = useTab()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const debouncedSearch = useDebounce(search, 150)
  const match = debouncedSearch ? `${debouncedSearch}*` : undefined

  const {
    data: indexes,
    isLoading,
    hasNextPage,
    fetchNextPage,
    isFetchingNextPage,
  } = useFetchSearchIndexes({ match })
  const [editingIndex, setEditingIndex] = useState<string | undefined>()

  // Auto-select first index if none is selected, or clear if selected index no longer exists
  useEffect(() => {
    if (!indexes || isLoading || debouncedSearch) return
    if (index && !indexes.includes(index)) {
      setValuesSearchIndex("")
    } else if (!index && indexes.length > 0) {
      setValuesSearchIndex(indexes[0])
    }
  }, [indexes, index, isLoading, setValuesSearchIndex, debouncedSearch])

  const handleEditIndex = (indexName: string) => {
    setOpen(false)
    setEditingIndex(indexName)
  }

  return (
    <div className="flex">
      <div className="flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-white px-3 text-sm text-zinc-700">
        Index
      </div>
      <Popover
        open={open}
        onOpenChange={(isOpen) => {
          setOpen(isOpen)
          if (!isOpen) setSearch("")
        }}
        modal={false}
      >
        <PopoverTrigger asChild>
          <button className="flex min-w-[140px] max-w-[240px] items-center justify-between gap-2 rounded-r-lg border border-zinc-300 bg-emerald-50 px-3 py-[5px] text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100">
            <span className="min-w-0 truncate">{index || "Select an index"}</span>
            <IconChevronDown className="size-4 shrink-0 opacity-50" />
          </button>
        </PopoverTrigger>
        <PopoverContent className="p-2" align="center">
          <div className="flex flex-col gap-2">
            <CreateIndexButton />

            <div className="h-px bg-zinc-100" />

            {/* Search input */}
            <div className="flex h-9 items-center rounded-md border border-zinc-300 px-2">
              <IconSearch className="size-5 text-zinc-400" />
              <input
                value={search}
                onChange={(e) => setSearch(e.target.value)}
                placeholder="Search Index"
                className="flex h-full w-full bg-transparent px-2 py-3 text-sm outline-none placeholder:text-zinc-400"
              />
            </div>

            {/* Index list */}
            <div className="max-h-[200px] overflow-y-auto">
              {isLoading && !indexes && (
                <div className="flex items-center justify-center py-4">
                  <IconLoader2 className="size-4 animate-spin text-zinc-400" />
                </div>
              )}
              {!isLoading && indexes?.length === 0 && (
                <div className="py-4 text-center text-sm text-zinc-500">No indexes found</div>
              )}
              {indexes?.map((idx) => (
                <div
                  key={idx}
                  className="relative flex h-9 items-center rounded-md transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-200"
                >
                  {/* Full-row overlay so the whole option (including padding) is clickable */}
                  <button
                    type="button"
                    aria-label={`Select ${idx}`}
                    onClick={() => {
                      setValuesSearchIndex(idx)
                      setOpen(false)
                    }}
                    className="absolute inset-0 rounded-md"
                  />
                  <div className="pointer-events-none flex min-w-0 flex-1 items-center gap-2 px-2 text-left text-sm">
                    <span
                      className={cn(
                        "flex size-5 shrink-0 items-center justify-center",
                        idx === index ? "text-emerald-600" : "text-transparent"
                      )}
                    >
                      <IconCircleCheck className="size-5" />
                    </span>
                    <span className="truncate">{idx}</span>
                  </div>
                  <button
                    type="button"
                    onClick={(event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      handleEditIndex(idx)
                    }}
                    className="relative z-10 mr-2 text-sm text-zinc-500 underline hover:text-zinc-700"
                  >
                    Edit
                  </button>
                </div>
              ))}

              {hasNextPage && (
                <button
                  onClick={() => fetchNextPage()}
                  disabled={isFetchingNextPage}
                  className="flex h-9 w-full items-center justify-center rounded-md text-sm text-emerald-600 transition-colors hover:bg-zinc-100 disabled:opacity-50"
                >
                  {isFetchingNextPage ? "Loading..." : "Load more"}
                </button>
              )}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <EditIndexModal
        open={Boolean(editingIndex)}
        onOpenChange={(isOpen) => !isOpen && setEditingIndex(undefined)}
        indexName={editingIndex}
      />
    </div>
  )
}

const CreateIndexButton = () => {
  const [open, setOpen] = useState(false)

  return (
    <>
      <button
        onClick={(e) => {
          e.stopPropagation()
          setOpen(true)
        }}
        className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-emerald-600 transition-colors hover:bg-zinc-100 dark:hover:bg-zinc-200"
      >
        <IconCirclePlus className="size-5" />
        <span className="underline">Create a new Index</span>
      </button>
      <CreateIndexModal open={open} onOpenChange={setOpen} />
    </>
  )
}
