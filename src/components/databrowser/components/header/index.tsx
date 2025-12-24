import { Segmented } from "@/components/ui/Segmented"
import { DataTypeSelector } from "../sidebar/type-selector"
import { SearchInput } from "../sidebar/search-input"
import { queryClient } from "@/lib/clients"
import {
  FETCH_KEYS_QUERY_KEY,
  FETCH_LIST_ITEMS_QUERY_KEY,
  FETCH_SIMPLE_KEY_QUERY_KEY,
  useKeys,
} from "../../hooks"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"
import { ReloadButton } from "../sidebar/reload-button"
import { AddKeyModal } from "../add-key-modal"
import { useTab } from "@/tab-provider"
import { useFetchSearchIndexes } from "../../hooks/use-fetch-search-indexes"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export const Header = () => {
  const { isValuesSearchSelected, setIsValuesSearchSelected } = useTab()

  return (
    <div className="flex items-center gap-1.5">
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
                Values
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
        <>
          <IndexSelector />
        </>
      ) : (
        <>
          {/* Types */}
          <DataTypeSelector />

          {/* Search */}
          <SearchInput />
        </>
      )}

      {/* Actions */}
      <RefreshButton />

      <AddKeyModal />
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
    <Select
      value={index}
      onValueChange={(value) => {
        setValuesSearchIndex(value)
      }}
    >
      <SelectTrigger className="select-none whitespace-nowrap border-zinc-300">
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
