import { useCallback, useEffect, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import { createInitialQueryState, parseBuilderQuery } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import { type QueryState } from "./types"

/**
 * What the builder shows for a stored query: its tree, or an error and an empty tree when the
 * query can't be shown. Never the previous tree, which belongs to another query (or index).
 */
export const loadBuilderQuery = (queryString: string): { state: QueryState; error?: string } => {
  const result = parseBuilderQuery(queryString)
  return result.success
    ? { state: result.state }
    : { state: createInitialQueryState(), error: result.error }
}

/**
 * Hook that manages query state synchronization with zustand store.
 * Handles bidirectional sync between local QueryState and the zustand query string.
 */
export const useQueryStateSync = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()

  const [initial] = useState(() => loadBuilderQuery(valuesSearch.query))

  // Local state for the query - this is our source of truth for rendering
  const [queryState, setQueryStateInternal] = useState<QueryState>(initial.state)

  // Set when the stored query can't be shown in the builder. The builder then writes nothing,
  // so the stored query is never overwritten by a tree that isn't it.
  const [unsupportedError, setUnsupportedError] = useState(initial.error)
  const unsupportedErrorRef = useRef(initial.error)

  // The last query string we parsed or wrote, so our own updates are not re-parsed.
  // A flag set on write would get stuck when the written string equals the stored one
  // (the store doesn't change, so the effect never runs) and swallow the next external change.
  const lastSyncedQuery = useRef<string>(valuesSearch.query)

  // Mirror of the latest state so setQueryState can compute the next state without
  // running side effects inside the useState updater (which executes during render).
  const queryStateRef = useRef(queryState)
  queryStateRef.current = queryState

  // Sync FROM zustand only when it changes from an external source (e.g. switching the index)
  useEffect(() => {
    if (valuesSearch.query === lastSyncedQuery.current) return
    lastSyncedQuery.current = valuesSearch.query

    const loaded = loadBuilderQuery(valuesSearch.query)
    unsupportedErrorRef.current = loaded.error
    setUnsupportedError(loaded.error)
    queryStateRef.current = loaded.state
    setQueryStateInternal(loaded.state)
  }, [valuesSearch.query])

  // Setter that applies changes locally and syncs to zustand.
  // The zustand write runs here in the caller's context (event handler / effect), not
  // inside the useState updater, so it never fires during another component's render.
  const setQueryState = useCallback(
    (modifier: (state: QueryState) => QueryState) => {
      if (unsupportedErrorRef.current) return

      const newState = modifier(structuredClone(queryStateRef.current))
      queryStateRef.current = newState

      const newQueryString = stringifyQueryState(newState)
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
