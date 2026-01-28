import { useCallback, useEffect, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import { createInitialQueryState, parseQueryString } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import { type QueryState } from "./types"

/**
 * Hook that manages query state synchronization with zustand store.
 * Handles bidirectional sync between local QueryState and the zustand query string.
 */
export const useQueryStateSync = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()

  // Local state for the query - this is our source of truth for rendering
  const [queryState, setQueryStateInternal] = useState<QueryState>(() => {
    return parseQueryString(valuesSearch.query) ?? createInitialQueryState()
  })

  // Track our own updates to avoid re-parsing on our changes
  const lastSyncedQuery = useRef<string>(valuesSearch.query)
  const isOurUpdate = useRef(false)

  // Sync FROM zustand only when it changes from an external source
  useEffect(() => {
    // If this change was caused by us, skip re-parsing
    if (isOurUpdate.current) {
      isOurUpdate.current = false
      lastSyncedQuery.current = valuesSearch.query
      return
    }

    // External change - re-parse the query
    if (valuesSearch.query !== lastSyncedQuery.current) {
      const parsed = parseQueryString(valuesSearch.query)
      if (parsed) {
        setQueryStateInternal(parsed)
      }
      lastSyncedQuery.current = valuesSearch.query
    }
  }, [valuesSearch.query])

  // Setter that applies changes locally and syncs to zustand
  const setQueryState = useCallback(
    (modifier: (state: QueryState) => QueryState) => {
      setQueryStateInternal((currentState) => {
        const newState = modifier(structuredClone(currentState))

        // Sync to zustand
        const newQueryString = stringifyQueryState(newState)
        isOurUpdate.current = true
        lastSyncedQuery.current = newQueryString
        setValuesSearchQuery(newQueryString)

        return newState
      })
    },
    [setValuesSearchQuery]
  )

  return {
    queryState,
    setQueryState,
  }
}
