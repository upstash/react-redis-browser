import { useTab } from "@/tab-provider"
import { useFetchSearchIndex } from "../hooks/use-fetch-search-index"
import { PREFIX } from "./databrowser-instance"
import { QueryEditor } from "./display/input/query-editor"
import { useState } from "react"
import { parseJSObjectLiteral } from "@/lib/utils"

export const QueryBuilder = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()
  const [value, setValue] = useState(valuesSearch.query)
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)

  return (
    <div className="rounded-lg border border-zinc-300 bg-white px-[6px] dark:border-zinc-700">
      <QueryEditor
        height={300}
        value={value}
        onChange={(value) => {
          setValue(value)

          const sliced = value.slice(PREFIX.length)
          const parsed = parseJSObjectLiteral(sliced)
          if (parsed) {
            setValuesSearchQuery(value.slice(PREFIX.length))
          }
        }}
        schema={indexDetails?.schema}
      />
    </div>
  )
}
