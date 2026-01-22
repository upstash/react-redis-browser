import { useTab } from "@/tab-provider"

import { useFetchSearchIndex } from "../hooks/use-fetch-search-index"
import { PREFIX } from "./databrowser-instance"
import { QueryEditor } from "./search/query-editor"

export const QueryBuilder = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)

  const editorValue = PREFIX + (valuesSearch.query || "{}")

  return (
    <div className="rounded-lg border border-zinc-300 bg-white px-[6px] dark:border-zinc-700">
      <QueryEditor
        height={300}
        value={editorValue}
        onChange={(value) => {
          const queryPart = value.slice(PREFIX.length)
          setValuesSearchQuery(queryPart)
        }}
        schema={indexDetails}
      />
    </div>
  )
}
