import { useTab } from "@/tab-provider"

import type { SearchIndex } from "../../hooks/use-fetch-search-index"
import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { QueryBuilderUIProvider } from "./query-builder-context"
import { QueryGroup } from "./query-group"
import type { FieldInfo, FieldType } from "./types"
import { useQueryStateSync } from "./use-query-state-sync"

export const UIQueryBuilder = () => {
  const { valuesSearch } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)
  const { queryState, setQueryState } = useQueryStateSync()
  const fieldInfos = indexDetails?.schema ? extractFieldInfo(indexDetails.schema) : []

  return (
    <QueryBuilderUIProvider fieldInfos={fieldInfos} setQueryState={setQueryState}>
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <QueryGroup node={queryState.root} isRoot depth={0} />
      </div>
    </QueryBuilderUIProvider>
  )
}

const getFieldType = (schemaType: string): FieldType => {
  switch (schemaType) {
    case "TEXT": {
      return "string"
    }
    case "U64":
    case "I64":
    case "F64": {
      return "number"
    }
    case "BOOL": {
      return "boolean"
    }
    case "DATE": {
      return "date"
    }
    default: {
      return "unknown"
    }
  }
}

/**
 * Extracts field info from the index schema
 * The schema is a flat Record<string, DescribeFieldInfo> where keys are field paths
 */
const extractFieldInfo = (schema: SearchIndex["schema"]): FieldInfo[] => {
  return Object.entries(schema).map(([fieldPath, fieldInfo]) => ({
    name: fieldPath,
    type: getFieldType(fieldInfo.type),
  }))
}
