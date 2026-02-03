import { useCallback, useEffect, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import type { SearchIndex } from "../../hooks/use-fetch-search-index"
import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { QueryBuilderUIProvider } from "./query-builder-context"
import { QueryGroup } from "./query-group"
import type { FieldInfo, FieldType, QueryNode, QueryState } from "./types"
import { useQueryStateSync } from "./use-query-state-sync"

export const UIQueryBuilder = () => {
  const { valuesSearch } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)
  const { queryState, setQueryState } = useQueryStateSync()
  const fieldInfos = indexDetails?.schema ? extractFieldInfo(indexDetails.schema) : []

  // Normalize query state values on mount (when switching from text editor to UI builder)
  const hasNormalized = useRef(false)
  useEffect(() => {
    if (hasNormalized.current || fieldInfos.length === 0) return
    hasNormalized.current = true

    setQueryState((state) => normalizeQueryState(state, fieldInfos))
  }, [fieldInfos, setQueryState])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [hasTopShadow, setHasTopShadow] = useState(false)
  const [hasBottomShadow, setHasBottomShadow] = useState(false)

  const recomputeShadows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setHasTopShadow(scrollTop > 0)
    setHasBottomShadow(scrollTop + clientHeight < scrollHeight - 1)
  }, [])

  useEffect(() => {
    recomputeShadows()
    const el = scrollRef.current
    if (!el) return
    const obs = new ResizeObserver(() => recomputeShadows())
    obs.observe(el)
    return () => obs.disconnect()
  }, [recomputeShadows])

  return (
    <QueryBuilderUIProvider fieldInfos={fieldInfos} setQueryState={setQueryState}>
      <div className="relative max-h-[300px] rounded-lg border border-zinc-200 bg-zinc-50">
        <div
          className={`scroll-shadow-top pointer-events-none absolute left-0 top-0 z-10 h-6 w-full rounded-t-lg transition-opacity duration-200 ${
            hasTopShadow ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          className={`scroll-shadow-bottom pointer-events-none absolute bottom-0 left-0 z-10 h-6 w-full rounded-b-lg transition-opacity duration-200 ${
            hasBottomShadow ? "opacity-100" : "opacity-0"
          }`}
        />
        <div
          ref={scrollRef}
          onScroll={recomputeShadows}
          className="max-h-[300px] overflow-y-auto p-4"
        >
          <QueryGroup node={queryState.root} isRoot depth={0} />
        </div>
      </div>
    </QueryBuilderUIProvider>
  )
}

/** Normalize a value based on the expected field type */
const normalizeValue = (
  value: string | number | boolean | string[],
  fieldType: FieldType
): string | number | boolean | string[] => {
  if (fieldType === "number" && typeof value === "string" && value !== "") {
    const num = Number(value)
    if (!Number.isNaN(num)) return num
  }

  if (fieldType === "string" && typeof value === "number") {
    return String(value)
  }

  if (fieldType === "boolean") {
    if (value === "true") return true
    if (value === "false") return false
  }

  return value
}

/** Normalize all condition values in a query node tree */
const normalizeNode = (node: QueryNode, fieldInfos: FieldInfo[]): QueryNode => {
  if (node.type === "condition") {
    const fieldInfo = fieldInfos.find((f) => f.name === node.condition.field)
    if (fieldInfo) {
      return {
        ...node,
        condition: {
          ...node.condition,
          value: normalizeValue(node.condition.value, fieldInfo.type),
        },
      }
    }
    return node
  }

  if (node.type === "group") {
    return {
      ...node,
      children: node.children.map((child) => normalizeNode(child, fieldInfos)),
    }
  }

  return node
}

/** Normalize query state values based on field types */
const normalizeQueryState = (state: QueryState, fieldInfos: FieldInfo[]): QueryState => {
  return { ...state, root: normalizeNode(state.root, fieldInfos) }
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
