import { useTab } from "@/tab-provider"

import { queryClient } from "@/lib/clients"
import { Segmented } from "@/components/ui/segmented"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import {
  FETCH_KEYS_QUERY_KEY,
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  useKeys,
} from "../../hooks"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"
import { useFetchSearchIndexes } from "../../hooks/use-fetch-search-indexes"
import { AddKeyModal } from "../add-key-modal"
import { ReloadButton } from "../sidebar/reload-button"
import { SearchInput } from "../sidebar/search-input"
import { DataTypeSelector } from "../sidebar/type-selector"

export const Header = () => {
  const { isValuesSearchSelected, setIsValuesSearchSelected } = useTab()

  return (
    <div className="flex items-center justify-between gap-1.5">
      <div className="flex grow items-center gap-1.5">
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
        />
        {isValuesSearchSelected ? (
          <IndexSelector />
        ) : (
          <>
            <DataTypeSelector />
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
  const { data } = useFetchSearchIndexes()

  return (
    <div className="flex">
      <div className="flex items-center rounded-l-lg border border-r-0 border-zinc-300 bg-white px-3 text-sm text-zinc-700">
        Index
      </div>
      <Select
        value={index}
        onValueChange={(value) => {
          setValuesSearchIndex(value)
        }}
      >
        <SelectTrigger className="w-auto select-none whitespace-nowrap rounded-l-none border-zinc-300 bg-emerald-50 pr-8 text-sm font-medium text-emerald-800">
          <SelectValue placeholder="Select an index" />
        </SelectTrigger>
        <SelectContent>
          <SelectGroup>
            {data?.map((index) => (
              <SelectItem key={index} value={index}>
                {index}
              </SelectItem>
            ))}
          </SelectGroup>
        </SelectContent>
      </Select>
    </div>
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
