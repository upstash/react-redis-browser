import { useTab } from "@/tab-provider"

import { useFetchSearchIndex } from "../hooks/use-fetch-search-index"
import { PREFIX } from "./databrowser-instance"
import { QueryEditor } from "./search/query-editor"

export const QueryBuilder = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)

  const editorValue = PREFIX + (valuesSearch.query || "{}")

  if (!indexDetails) return

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-300 bg-white px-[6px]">
      <div className="relative min-h-0 flex-1">
        <div className="absolute inset-0">
          <QueryEditor
            value={editorValue}
            onChange={(value) => {
              const queryPart = value.slice(PREFIX.length)
              setValuesSearchQuery(queryPart)
            }}
            schema={indexDetails}
          />
        </div>
      </div>
    </div>
  )
}
