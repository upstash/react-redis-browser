import { useCallback, useEffect, useRef, useState } from "react"
import { useTab } from "@/tab-provider"

import { resolveBuilderQuery } from "./builder-query"
import { normalizeQueryState } from "./normalize-query-state"
import { createInitialQueryState } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import { type FieldInfo, type QueryState } from "./types"

/** Identifies a stored query: the same string under another index is another query */
const getQueryKey = (index: string, query: string) => JSON.stringify([index, query])

/**
 * Hook that manages query state synchronization with zustand store.
 * Handles bidirectional sync between local QueryState and the zustand query string.
 *
 * `fieldInfos` must be the schema of the current index (empty while it loads). Trees the
 * builder wrote get their values normalized to it once it is known.
 */
export const useQueryStateSync = (fieldInfos: FieldInfo[]) => {
  const { valuesSearch, setValuesSearchQuery } = useTab()
  const { index, query, queryWrittenBy } = valuesSearch

  // Local state for the query - this is our source of truth for rendering
  const [initial] = useState(() => resolveBuilderQuery(query, queryWrittenBy))
  const [queryState, setQueryStateInternal] = useState<QueryState>(() =>
    initial.success ? initial.state : createInitialQueryState()
  )

  // Set when the stored query can't be shown without changing it.
  // The builder must then leave the query untouched.
  const [unsupportedError, setUnsupportedError] = useState(() =>
    initial.success ? undefined : initial.error
  )

  // The effects below and setQueryState read refs, not render values: they run in the same
  // commit as the load of another index's query and must see its outcome right away.

  // The key of the query we last loaded or wrote, so our own updates are not re-parsed.
  // Starts unset so the mount is handled like an external change.
  const lastSyncedKey = useRef<string>()

  // The index whose query the tree in queryStateRef shows, unset while it shows none
  const loadedIndex = useRef<string>()

  // The current index, as of the last render
  const currentIndex = useRef(index)
  currentIndex.current = index

  // The schema the shown tree was last normalized with (or seen with, for typed queries)
  const normalizedWith = useRef<FieldInfo[]>()

  // Mirror of the latest state so setQueryState can compute the next state without
  // running side effects inside the useState updater (which executes during render).
  const queryStateRef = useRef(queryState)

  // Sync FROM zustand on mount and whenever it changes from an external source
  // (e.g. switching the index)
  useEffect(() => {
    const key = getQueryKey(index, query)
    if (key === lastSyncedKey.current) return
    lastSyncedKey.current = key

    const result = resolveBuilderQuery(query, queryWrittenBy)
    setUnsupportedError(result.success ? undefined : result.error)
    if (!result.success) {
      loadedIndex.current = undefined
      return
    }

    queryStateRef.current = result.state
    loadedIndex.current = index
    normalizedWith.current = undefined
    setQueryStateInternal(result.state)

    // The builder tree is the source of truth, store its string so results match it
    if (result.rewrite !== undefined) {
      lastSyncedKey.current = getQueryKey(index, result.rewrite)
      setValuesSearchQuery(result.rewrite, "ui")
    }
  }, [index, query])

  // Setter that applies changes locally and syncs to zustand.
  // The zustand write runs here in the caller's context (event handler / effect), not
  // inside the useState updater, so it never fires during another component's render.
  const setQueryState = useCallback(
    (modifier: (state: QueryState) => QueryState) => {
      // The tree belongs to another index's query, or to none (the query is unsupported),
      // until the sync effect has loaded the current one
      if (loadedIndex.current === undefined || loadedIndex.current !== currentIndex.current) {
        return
      }

      const newState = modifier(structuredClone(queryStateRef.current))
      queryStateRef.current = newState

      const newQueryString = stringifyQueryState(newState)
      lastSyncedKey.current = getQueryKey(loadedIndex.current, newQueryString)

      setQueryStateInternal(newState)
      setValuesSearchQuery(newQueryString, "ui")
    },
    [setValuesSearchQuery]
  )

  // Normalize values to the field types once the schema is known (and whenever it changes,
  // e.g. after the index is edited), for trees the builder wrote. Queries typed in the code
  // editor are opened unchanged, so they are not normalized.
  useEffect(() => {
    if (fieldInfos.length === 0 || normalizedWith.current === fieldInfos) return
    // Wait until the tree shows the stored query of this index (e.g. after a rewrite)
    if (loadedIndex.current !== index || lastSyncedKey.current !== getQueryKey(index, query)) {
      return
    }
    normalizedWith.current = fieldInfos
    if (queryWrittenBy !== "ui") return

    // Writing an unchanged string keeps the query's tag (see setValuesSearchQuery)
    setQueryState((state) => normalizeQueryState(state, fieldInfos))
  }, [fieldInfos, index, query, queryWrittenBy, setQueryState])

  return {
    queryState,
    setQueryState,
    unsupportedError,
  }
}
