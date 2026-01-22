import { useTab } from "@/tab-provider"

import type { SearchIndex } from "../../hooks/use-fetch-search-index"
import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { QueryBuilderUIProvider } from "./query-builder-context"
import { QueryGroup } from "./query-group"
import type { FieldInfo, FieldType } from "./types"
import { useQueryStateSync } from "./use-query-state-sync"

// ============================================================================
// HELPER: Extract field names and types from schema
// ============================================================================

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

// ============================================================================
// MAIN COMPONENT
// ============================================================================

export const UIQueryBuilder = () => {
  const { valuesSearch } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)

  // Extract field info (names and types) from schema
  const fieldInfos = indexDetails?.schema ? extractFieldInfo(indexDetails.schema) : []
  const fieldNames = fieldInfos.map((f) => f.name)

  // Use the sync hook for query state management
  const { queryState, setQueryState } = useQueryStateSync()

  return (
    <QueryBuilderUIProvider
      fieldNames={fieldNames}
      fieldInfos={fieldInfos}
      setQueryState={setQueryState}
    >
      <div className="rounded-lg border border-zinc-200 bg-zinc-50 p-4">
        <QueryGroup node={queryState.root} isRoot depth={0} />
      </div>
    </QueryBuilderUIProvider>
  )
}

// Re-export types for convenience
export type { SearchIndex as IndexSchema } from "../../hooks/use-fetch-search-index"
export type { FieldCondition as SchemaField } from "./types"
