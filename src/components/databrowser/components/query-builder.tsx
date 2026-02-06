import { useTab } from "@/tab-provider"
import { IconExternalLink } from "@tabler/icons-react"

import { useFetchSearchIndex } from "../hooks/use-fetch-search-index"
import { PREFIX } from "./databrowser-instance"
import { QueryEditor } from "./search/query-editor"

export const QueryBuilder = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)

  const editorValue = PREFIX + (valuesSearch.query || "{}")

  return (
    <div className="flex h-full flex-col rounded-lg border border-zinc-300 bg-white px-[6px]">
      <div className="min-h-0 flex-1">
        <QueryEditor
          value={editorValue}
          onChange={(value) => {
            const queryPart = value.slice(PREFIX.length)
            setValuesSearchQuery(queryPart)
          }}
          schema={indexDetails}
        />
      </div>
      <div className="flex items-center justify-end px-2 pb-1.5">
        <a
          href="https://upstash-search.mintlify.app/redis/search/query-operators/boolean-operators/overview"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center gap-1 text-xs text-zinc-400 transition-colors hover:text-zinc-600"
        >
          Docs
          <IconExternalLink size={12} />
        </a>
      </div>
    </div>
  )
}
