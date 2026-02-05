import { useState } from "react"
import { useTab } from "@/tab-provider"
import { IconChevronDown, IconCircleCheck, IconCirclePlus, IconSearch } from "@tabler/icons-react"

import { queryClient } from "@/lib/clients"
import { cn } from "@/lib/utils"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { Segmented } from "@/components/ui/segmented"

import type { TabType } from "../.."
import { ReloadButton } from "../../../common/reload-button"
import {
  FETCH_KEYS_QUERY_KEY,
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  useKeys,
} from "../../hooks"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"
import { useFetchSearchIndexes } from "../../hooks/use-fetch-search-indexes"
import { AddKeyModal } from "../add-key-modal"
import { CreateIndexModal } from "../search/create-index-modal"
import { EditIndexModal } from "../search/edit-index-modal"
import { SearchInput } from "../sidebar/search-input"
import { DataTypeSelector } from "../sidebar/type-selector"

export const Header = ({ tabType }: { tabType: TabType }) => {
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
                label: (
                  <div className="flex items-center gap-1">
                    Search
                    <div className="flex h-[18px] items-center rounded-md bg-emerald-100 px-[5px] text-[11px] text-emerald-700">
                      NEW
                    </div>
                  </div>
                ),
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
          <IndexSelector />
        ) : (
          <>
            <DataTypeSelector hideSearchTab={hideSearchTab} />
            <SearchInput />
          </>
        )}
      </div>

      {/* Actions */}
      <div className="flex items-center gap-1.5">
        <RefreshButton />
        <AddKeyModal />
      </div>
    </div>
  )
}

const IndexSelector = () => {
  const {
    valuesSearch: { index },
    setValuesSearchIndex,
  } = useTab()
  const { data: indexes } = useFetchSearchIndexes()
  const [open, setOpen] = useState(false)
  const [search, setSearch] = useState("")
  const [editingIndex, setEditingIndex] = useState<string | null>(null)

  const filteredIndexes = indexes?.filter((idx) => idx.toLowerCase().includes(search.toLowerCase()))

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
          <button className="flex min-w-[140px] items-center justify-between gap-2 rounded-r-lg border border-zinc-300 bg-emerald-50 px-3 py-[5px] text-sm font-medium text-emerald-800 transition-colors hover:bg-emerald-100">
            <span className="truncate">{index || "Select an index"}</span>
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
              {filteredIndexes?.length === 0 && (
                <div className="py-4 text-center text-sm text-zinc-500">No indexes found</div>
              )}
              {filteredIndexes?.map((idx) => (
                <div
                  key={idx}
                  className="flex h-9 items-center rounded-md px-2 transition-colors hover:bg-zinc-100"
                >
                  <button
                    onClick={() => {
                      setValuesSearchIndex(idx)
                      setOpen(false)
                    }}
                    className="flex flex-1 items-center gap-2 text-left text-sm"
                  >
                    <span
                      className={cn(
                        "flex size-5 items-center justify-center",
                        idx === index ? "text-emerald-600" : "text-transparent"
                      )}
                    >
                      <IconCircleCheck className="size-5" />
                    </span>
                    <span className="truncate">{idx}</span>
                  </button>
                  <button
                    onClick={(event) => {
                      event.stopPropagation()
                      event.preventDefault()
                      handleEditIndex(idx)
                    }}
                    className="ml-2 text-sm text-zinc-500 underline hover:text-zinc-700"
                  >
                    Edit
                  </button>
                </div>
              ))}
            </div>
          </div>
        </PopoverContent>
      </Popover>

      <EditIndexModal
        open={Boolean(editingIndex)}
        onOpenChange={(isOpen) => !isOpen && setEditingIndex(null)}
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
        className="flex h-9 w-full items-center gap-2 rounded-md px-2 text-sm text-emerald-600 transition-colors hover:bg-zinc-50"
      >
        <IconCirclePlus className="size-5" />
        <span className="underline">Create a new Index</span>
      </button>
      <CreateIndexModal open={open} onOpenChange={setOpen} />
    </>
  )
}

const RefreshButton = () => {
  const { query } = useKeys()

  return (
    <ReloadButton
      onClick={() => {
        queryClient.invalidateQueries({
          queryKey: [FETCH_KEYS_QUERY_KEY],
        })
        queryClient.invalidateQueries({
          queryKey: [FETCH_LIST_ITEMS_QUERY_KEY],
        })
        queryClient.invalidateQueries({
          queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY],
        })
        queryClient.invalidateQueries({
          queryKey: [FETCH_KEY_TYPE_QUERY_KEY],
        })
      }}
      isLoading={query.isFetching}
    />
  )
}
