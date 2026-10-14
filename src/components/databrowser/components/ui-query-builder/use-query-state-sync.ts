import { useCallback, useEffect, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import { createInitialQueryState, getQueryBuilderError, parseQueryString } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import { type QueryState } from "./types"

/**
 * Hook that manages query state synchronization with zustand store.
 * Handles bidirectional sync between local QueryState and the zustand query string.
 */
// Queries reach the builder here either after the code editor switch accepted them, or
// because the builder wrote them (builder mode on load or index switch), so the shapes older
// builder versions wrote are accepted too
const PARSE_OPTIONS = { allowLegacy: true }

export const useQueryStateSync = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()

  // Local state for the query - this is our source of truth for rendering
  const [queryState, setQueryStateInternal] = useState<QueryState>(() => {
    return parseQueryString(valuesSearch.query, PARSE_OPTIONS) ?? createInitialQueryState()
  })

  // Set when a query from outside the builder can't be represented without changing it.
  // The builder must then leave the query untouched.
  const [unsupportedError, setUnsupportedError] = useState(() =>
    getQueryBuilderError(valuesSearch.query, PARSE_OPTIONS)
  )

  // Track our own updates to avoid re-parsing on our changes
  const lastSyncedQuery = useRef<string>(valuesSearch.query)
  const isOurUpdate = useRef(false)

  // Mirror of the latest state so setQueryState can compute the next state without
  // running side effects inside the useState updater (which executes during render).
  const queryStateRef = useRef(queryState)
  queryStateRef.current = queryState

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
      const error = getQueryBuilderError(valuesSearch.query, PARSE_OPTIONS)
      setUnsupportedError(error)
      const parsed = error ? undefined : parseQueryString(valuesSearch.query, PARSE_OPTIONS)
      if (parsed) {
        setQueryStateInternal(parsed)
      }
      lastSyncedQuery.current = valuesSearch.query
    }
  }, [valuesSearch.query])

  // Setter that applies changes locally and syncs to zustand.
  // The zustand write runs here in the caller's context (event handler / effect), not
  // inside the useState updater, so it never fires during another component's render.
  const setQueryState = useCallback(
    (modifier: (state: QueryState) => QueryState) => {
      const newState = modifier(structuredClone(queryStateRef.current))
      queryStateRef.current = newState

      const newQueryString = stringifyQueryState(newState)
      isOurUpdate.current = true
      lastSyncedQuery.current = newQueryString

      setQueryStateInternal(newState)
      setValuesSearchQuery(newQueryString)
    },
    [setValuesSearchQuery]
  )

  return {
    queryState,
    setQueryState,
    unsupportedError,
  }
}
