import { useCallback, useEffect, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import { resolveBuilderQuery } from "./builder-query"
import { createInitialQueryState } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import { type QueryState } from "./types"

/**
 * Hook that manages query state synchronization with zustand store.
 * Handles bidirectional sync between local QueryState and the zustand query string.
 */
export const useQueryStateSync = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()

  // Local state for the query - this is our source of truth for rendering
  const [initial] = useState(() =>
    resolveBuilderQuery(valuesSearch.query, valuesSearch.queryWrittenBy)
  )
  const [queryState, setQueryStateInternal] = useState<QueryState>(() =>
    initial.success ? initial.state : createInitialQueryState()
  )

  // Set when the stored query can't be shown without changing it.
  // The builder must then leave the query untouched.
  const [unsupportedError, setUnsupportedError] = useState(() =>
    initial.success ? undefined : initial.error
  )

  // The last query string we loaded or wrote, so our own updates are not re-parsed.
  // Starts unset so the mount is handled like an external change.
  const lastSyncedQuery = useRef<string>()

  // Mirror of the latest state so setQueryState can compute the next state without
  // running side effects inside the useState updater (which executes during render).
  const queryStateRef = useRef(queryState)
  queryStateRef.current = queryState

  // Sync FROM zustand on mount and whenever it changes from an external source
  // (e.g. switching the index)
  useEffect(() => {
    if (valuesSearch.query === lastSyncedQuery.current) return
    lastSyncedQuery.current = valuesSearch.query

    const result = resolveBuilderQuery(valuesSearch.query, valuesSearch.queryWrittenBy)
    setUnsupportedError(result.success ? undefined : result.error)
    if (!result.success) return

    queryStateRef.current = result.state
    setQueryStateInternal(result.state)

    // The builder tree is the source of truth, store its string so results match it
    if (result.rewrite !== undefined) {
      lastSyncedQuery.current = result.rewrite
      setValuesSearchQuery(result.rewrite, "ui")
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
      lastSyncedQuery.current = newQueryString

      setQueryStateInternal(newState)
      setValuesSearchQuery(newQueryString, "ui")
    },
    [setValuesSearchQuery]
  )

  return {
    queryState,
    setQueryState,
    unsupportedError,
  }
}
