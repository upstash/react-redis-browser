import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import { ScrollArea } from "@/components/ui/scroll-area"

import type { SearchIndex } from "../../hooks/use-fetch-search-index"
import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { QueryBuilderUIProvider } from "./query-builder-context"
import { QueryGroup } from "./query-group"
import type { FieldInfo, FieldType } from "./types"
import { useQueryStateSync } from "./use-query-state-sync"

export const UIQueryBuilder = ({
  onUnsupportedQuery,
}: {
  /** Called when the query can't be shown in the builder without changing it */
  onUnsupportedQuery: (error: string) => void
}) => {
  const { valuesSearch } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)
  const schema = indexDetails?.schema
  const fieldInfos = useMemo(() => (schema ? extractFieldInfo(schema) : []), [schema])
  const { queryState, setQueryState, unsupportedError } = useQueryStateSync(fieldInfos)

  useEffect(() => {
    if (unsupportedError) onUnsupportedQuery(unsupportedError)
  }, [unsupportedError, onUnsupportedQuery])

  const scrollAreaRef = useRef<HTMLDivElement>(null)
  const viewportRef = useRef<HTMLElement | null>(null)
  const [hasTopShadow, setHasTopShadow] = useState(false)
  const [hasBottomShadow, setHasBottomShadow] = useState(false)

  const recomputeShadows = useCallback(() => {
    const el = viewportRef.current
    if (!el) return
    const { scrollTop, scrollHeight, clientHeight } = el
    setHasTopShadow(scrollTop > 0)
    setHasBottomShadow(scrollTop + clientHeight < scrollHeight - 1)
  }, [])

  useEffect(() => {
    viewportRef.current = scrollAreaRef.current?.querySelector(
      "[data-radix-scroll-area-viewport]"
    ) as HTMLElement | null
    recomputeShadows()
    const el = viewportRef.current
    if (!el) return
    const obs = new ResizeObserver(() => recomputeShadows())
    obs.observe(el)
    return () => obs.disconnect()
  }, [recomputeShadows])

  return (
    <QueryBuilderUIProvider fieldInfos={fieldInfos} setQueryState={setQueryState}>
      <div className="relative h-full min-h-0 rounded-lg bg-zinc-50 dark:bg-zinc-50/40">
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
        <ScrollArea
          ref={scrollAreaRef}
          onScroll={recomputeShadows}
          className="h-full"
          scrollBarClassName="py-1"
        >
          <div className="p-4">
            <QueryGroup node={queryState.root} isRoot depth={0} />
          </div>
        </ScrollArea>
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
const extractFieldInfo = (schema: NonNullable<SearchIndex>["schema"]): FieldInfo[] => {
  return Object.entries(schema).map(([fieldPath, fieldInfo]) => ({
    name: fieldPath,
    type: getFieldType(fieldInfo.type),
    noTokenize: fieldInfo.noTokenize,
    noStem: fieldInfo.noStem,
  }))
}
