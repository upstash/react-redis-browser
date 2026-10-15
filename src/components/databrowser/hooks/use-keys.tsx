import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { useRedis } from "@/redis-context"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import type { DataType, RedisKey } from "@/types"
import { useInfiniteQuery, useQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import {
  execFolderScan,
  getFolderMatch,
  getFolderQuery,
  getKeysStaleTime,
  isFolderScanUnsupported,
  isPrefixSearch,
  parseFolderScan,
  type KeyListEntry,
} from "@/lib/folders"
import { listSearchIndexes } from "@/lib/list-search-indexes"
import { parseJSObjectLiteral } from "@/lib/utils"

import { FETCH_KEY_TYPE_QUERY_KEY, useFetchKeyType } from "./use-fetch-key-type"
import { useFetchSearchIndex } from "./use-fetch-search-index"
import { useFoldersEnabled } from "./use-folders-enabled"

export type FolderView = {
  /** True when the list shows folders, false for the flat key list */
  enabled: boolean
  /** Whether the server supports folders, undefined until known */
  supported: boolean | undefined
  /** The open folder, "" for the root */
  folder: string
  delimiter: string
}

const KeysContext = createContext<
  | {
      keys: RedisKey[]
      // The rows of the list in order. Same as `keys` in the flat view, with folders mixed
      // in when the folder view is on.
      entries: KeyListEntry[]
      folderView: FolderView
      query: UseInfiniteQueryResult
      scan: { paused: boolean; scannedKeys: number }
    }
  | undefined
>(undefined)

export const FETCH_KEYS_QUERY_KEY = "use-fetch-keys"
export const FOLDER_SUPPORT_QUERY_KEY = "folder-support"

// A server without folder support is checked again after this long, since replicas may
// not all support folders yet during a rollout.
const FOLDER_SUPPORT_RECHECK_MS = 5 * 60 * 1000

/**
 * Whether the server supports `SCAN ... DELIMITER`. Undefined until known.
 *
 * The folder view finds out from its first scan. The flat view sends a one off probe so
 * the view toggle only shows up on servers that support folders. The answer is kept in
 * memory only, never in the persisted store.
 */
export const useFolderSupport = ({
  scansFolders,
  active,
}: {
  // Whether the key list itself sends a folder scan to find out
  scansFolders: boolean
  active: boolean
}) => {
  const { redisNoPipeline: redis } = useRedis()
  const supported = queryClient.getQueryData<boolean>([FOLDER_SUPPORT_QUERY_KEY])

  const { data } = useQuery({
    queryKey: [FOLDER_SUPPORT_QUERY_KEY],
    // The folder view tells by itself on its first scan, unless the server said no
    enabled: active && (!scansFolders || supported === false),
    staleTime: (query) =>
      query.state.data === false ? FOLDER_SUPPORT_RECHECK_MS : Number.POSITIVE_INFINITY,
    gcTime: Number.POSITIVE_INFINITY,
    retry: 2,
    meta: { hideToast: true },
    queryFn: async () => {
      try {
        await execFolderScan(redis, ["SCAN", "0", "COUNT", "1", "DELIMITER", ":", "WITHCOUNT"])
        return true
      } catch (error) {
        if (isFolderScanUnsupported(error)) return false
        throw error
      }
    },
  })

  return data
}

// Upstash REST caps SCAN at ~1000 examined/returned keys per call regardless of
// COUNT (measured), so escalating past 1000 is pointless. We still ramp up from a
// small count for a snappy first response, then sit at the 1000 ceiling.
const SCAN_COUNTS = [100, 500, 1000]

// Hard cap on SCAN round-trips per page fetch. On a large keyspace a type filter
// can match nothing for millions of keys; without this the query loops effectively
// forever. When the budget is spent without finding a key we yield an empty page
// and let the user explicitly continue (see `scan.paused`).
const MAX_SCANS_PER_FETCH = 20

type ScanResult = { cursor: string; keys: KeyListEntry[] }

export const KeysProvider = ({ children }: PropsWithChildren) => {
  const { active, search, valuesSearch, isValuesSearchSelected, folder } = useTab()
  const { keyListView, folderDelimiter } = useDatabrowserStore()
  const foldersEnabled = useFoldersEnabled()
  const { data: searchIndexDetails, isLoading: isIndexDetailsLoading } = useFetchSearchIndex(
    valuesSearch.index,
    { enabled: isValuesSearchSelected }
  )

  const { redisNoPipeline: redis } = useRedis()

  const parsedValueQuery = parseJSObjectLiteral(valuesSearch.query)

  const isQueryEnabled =
    active &&
    (isValuesSearchSelected ? Boolean(valuesSearch.index) && Boolean(searchIndexDetails) : true)

  // Search indexes and value search results have no folders
  const wantsFolders =
    foldersEnabled &&
    keyListView === "folders" &&
    !isValuesSearchSelected &&
    search.type !== "search"
  const folderSupport = useFolderSupport({
    scansFolders: wantsFolders && isPrefixSearch(search.key),
    // Turned off folders never probe the server
    active: active && foldersEnabled,
  })
  const folderView: FolderView = {
    enabled: wantsFolders && folderSupport === true,
    supported: foldersEnabled ? folderSupport : false,
    folder,
    delimiter: folderDelimiter,
  }
  // Part of the query key. A server without folder support gets the flat list, and the
  // folder view comes back if a later check finds support.
  const folderQuery = getFolderQuery({
    wantsFolders,
    supported: folderSupport,
    folder,
    delimiter: folderDelimiter,
    search: search.key,
  })

  // Redis folder scan, falls back to the flat scan on servers without folder support
  const redisFolderScan = async ({
    count,
    cursor,
  }: {
    count: number
    cursor: string
  }): Promise<ScanResult> => {
    if (!folderQuery) return redisKeyScan({ count, cursor })

    const match = getFolderMatch(folderQuery.folder, search.key)

    // The server lists a folder only when its own name matches, so a pattern like
    // "*session*" would hide every match inside folders. Search all keys below the
    // folder instead and show them by their path.
    if (!isPrefixSearch(search.key)) return redisKeyScan({ count, cursor, match })

    const args: [string, ...string[]] = ["SCAN", cursor, "MATCH", match]
    if (search.type) args.push("TYPE", search.type)
    args.push("COUNT", count.toString(), "DELIMITER", folderQuery.delimiter, "WITHCOUNT")

    let result: [string, unknown[]]
    try {
      result = await execFolderScan<[string, unknown[]]>(redis, args)
    } catch (error) {
      if (!isFolderScanUnsupported(error)) throw error

      // Switches this tab's query key to the flat list for the session. That query does
      // the scan, this one ends with an empty page.
      queryClient.setQueryData([FOLDER_SUPPORT_QUERY_KEY], false)
      return { cursor: "0", keys: [] }
    }

    if (queryClient.getQueryData([FOLDER_SUPPORT_QUERY_KEY]) !== true) {
      queryClient.setQueryData([FOLDER_SUPPORT_QUERY_KEY], true)
    }

    const [newCursor, values] = result
    return { cursor: newCursor, keys: parseFolderScan(values) }
  }

  // Redis default key scan
  const redisKeyScan = async ({
    count,
    cursor,
    match = search.key,
  }: {
    count: number
    cursor: string
    match?: string
  }): Promise<ScanResult> => {
    const args = [cursor]

    if (match) {
      args.push("MATCH", match)
    }

    if (search.type) {
      args.push("TYPE", search.type)
    }

    args.push("COUNT", count.toString())

    if (!search.type) args.push("WITHTYPE")

    const [newCursor, values] = await redis.exec<[string, string[]]>(["SCAN", ...args])

    // Deserialize keys from the SCAN result
    const keys: KeyListEntry[] = []
    let index = 0
    while (true) {
      if (search.type) {
        if (index >= values.length) break
        keys.push({ kind: "key", key: values[index], type: search.type as DataType })
        index += 1
      } else {
        if (index + 1 >= values.length) break
        keys.push({ kind: "key", key: values[index], type: values[index + 1] as DataType })
        index += 2
      }
    }

    return { cursor: newCursor, keys }
  }

  // Redis search index scan — used when the type filter is "search"
  const redisSearchIndexScan = async ({
    count,
    cursor,
  }: {
    count: number
    cursor: string
  }): Promise<ScanResult> => {
    const offset = Number.parseInt(cursor, 10) || 0

    const names = await listSearchIndexes(redis, {
      match: search.key || undefined,
      limit: count,
      offset,
    })
    const keys = names.map((name): KeyListEntry => ({ kind: "key", key: name, type: "search" }))

    const hasMore = keys.length >= count
    const nextCursor = hasMore ? String(offset + keys.length) : "0"

    return { cursor: nextCursor, keys }
  }

  // Redis search value scan
  const redisValueScan = async ({
    count,
    cursor,
  }: {
    count: number
    cursor: string
  }): Promise<ScanResult> => {
    if (!searchIndexDetails) throw new Error("Attempted search while loading the search index")

    const offset = Number.parseInt(cursor, 10) || 0

    const result = await redis.search
      .index({
        name: valuesSearch.index,
      })
      .query({
        filter: parsedValueQuery ?? {},
        limit: count,
        offset,
        select: {},
        withScores: true,
      })

    const keys = result.map(
      (doc): KeyListEntry => ({
        kind: "key",
        key: doc.key,
        type: searchIndexDetails.dataType,
        score: doc.score,
      })
    )

    // If we got fewer results than the limit, we've reached the end
    const hasMore = keys.length >= count
    const nextCursor = hasMore ? String(offset + keys.length) : "0"

    return { cursor: nextCursor, keys }
  }

  const performScan = async (count: number, cursor: string) => {
    const scanFunction = isValuesSearchSelected
      ? redisValueScan
      : search.type === "search"
        ? redisSearchIndexScan
        : redisFolderScan

    const result = await scanFunction({ count, cursor })
    return [result.cursor, result.keys] as const
  }

  /**
   * Keeps scanning until a key shows up, the keyspace is exhausted, or this
   * fetch's request budget (MAX_SCANS_PER_FETCH) is spent.
   *
   * When the db is large and sparse for the active type filter, matching keys can
   * be millions of keys apart. Rather than loop until we find one (which can mean
   * tens of thousands of requests), we stop after a bounded number of round-trips
   * and report back so the UI can pause and let the user continue on demand.
   *
   * `signal` is React Query's abort signal; we bail between round-trips so a
   * filter/type change cancels the in-flight scan instead of churning in the
   * background.
   */
  const scanUntilAvailable = async (cursor: string, signal?: AbortSignal) => {
    let scannedKeys = 0
    for (let i = 0; ; i++) {
      if (signal?.aborted) throw new DOMException("Scan aborted", "AbortError")

      const count = SCAN_COUNTS[i] ?? SCAN_COUNTS.at(-1)
      const [newCursor, values] = await performScan(count, cursor)
      cursor = newCursor
      // SCAN examines at most ~1000 keys per call on Upstash REST (see SCAN_COUNTS).
      scannedKeys += Math.min(count, 1000)

      const exhausted = cursor === "0"
      const budgetSpent = i + 1 >= MAX_SCANS_PER_FETCH
      if (values.length > 0 || exhausted || budgetSpent) {
        // paused === we spent the budget without finding anything and there is
        // still more keyspace left to scan.
        const paused = budgetSpent && values.length === 0 && !exhausted
        return { cursor, values, scannedKeys, paused }
      }
    }
  }

  const query = useInfiniteQuery({
    queryKey: [FETCH_KEYS_QUERY_KEY, search, valuesSearch, isValuesSearchSelected, folderQuery],
    enabled: isQueryEnabled,

    initialPageParam: "0",
    queryFn: async ({ pageParam: lastCursor, signal }) => {
      const { cursor, values, scannedKeys, paused } = await scanUntilAvailable(lastCursor, signal)

      // Save in cache to not send additional requests with useFetchKeyType
      for (const entry of values) {
        if (entry.kind === "key")
          queryClient.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, entry.key], entry.type)
      }

      return {
        cursor: cursor === "0" ? undefined : cursor,
        entries: values,
        hasNextPage: cursor !== "0",
        scannedKeys,
        paused,
      }
    },
    meta: {
      hideToast: true,
    },
    select: (data) => data,
    getNextPageParam: ({ cursor }) => cursor,
    refetchOnMount: false,
    // Going back to a folder reuses its pages instead of scanning them all again.
    // Refresh and key changes invalidate the list, which still refetches.
    staleTime: getKeysStaleTime(folderQuery),
  })

  const { entries, keys } = useMemo(() => {
    const allEntries = query.data?.pages.flatMap((page) => page.entries) ?? []

    // deduplication
    const seen = new Set<string>()
    const folders: KeyListEntry[] = []
    const keyEntries: KeyListEntry[] = []
    const keys: RedisKey[] = []

    for (const entry of allEntries) {
      const id = `${entry.kind}:${entry.key}`
      if (seen.has(id)) continue

      seen.add(id)
      if (entry.kind === "folder") {
        folders.push(entry)
      } else {
        keyEntries.push(entry)
        keys.push([entry.key, entry.type, entry.score])
      }
    }
    // Folders go above the keys, each group keeps the scan order
    return { entries: [...folders, ...keyEntries], keys }
  }, [query.data])

  const scan = useMemo(() => {
    const pages = query.data?.pages ?? []
    return {
      // Latest fetch spent its budget without a match — wait for the user to continue.
      paused: Boolean(pages.at(-1)?.paused),
      scannedKeys: pages.reduce((sum, page) => sum + (page.scannedKeys ?? 0), 0),
    }
  }, [query.data])

  return (
    <KeysContext.Provider
      value={{
        keys,
        entries,
        folderView,
        query: {
          ...query,
          isLoading: query.isLoading || isIndexDetailsLoading,
        } as UseInfiniteQueryResult,
        scan,
      }}
    >
      {children}
    </KeysContext.Provider>
  )
}

export const useKeys = () => {
  const context = useContext(KeysContext)
  if (!context) {
    throw new Error("useKeys must be used within a KeysProvider")
  }
  return context
}

export const useKeyType = (key?: string) => {
  const { keys, folderView } = useKeys()

  const keyTuple = useMemo(() => keys.find(([k, _]) => k === key), [keys, key])

  // In the folder view the open key may not be in the list after going to another folder
  const { data: fetchedType } = useFetchKeyType(key, {
    enabled: folderView.enabled && key !== undefined && !keyTuple,
  })

  if (keyTuple || !folderView.enabled) return keyTuple?.[1]
  return fetchedType === "none" ? undefined : (fetchedType as DataType)
}
