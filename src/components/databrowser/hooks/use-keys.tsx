import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import type { DataType, RedisKey } from "@/types"
import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import { listSearchIndexes } from "@/lib/list-search-indexes"
import { parseJSObjectLiteral } from "@/lib/utils"

import { FETCH_KEY_TYPE_QUERY_KEY } from "./use-fetch-key-type"
import { useFetchSearchIndex } from "./use-fetch-search-index"

const KeysContext = createContext<
  | {
      keys: RedisKey[]
      query: UseInfiniteQueryResult
      scan: { paused: boolean; scannedKeys: number }
    }
  | undefined
>(undefined)

export const FETCH_KEYS_QUERY_KEY = "use-fetch-keys"

// Upstash REST caps SCAN at ~1000 examined/returned keys per call regardless of
// COUNT (measured), so escalating past 1000 is pointless. We still ramp up from a
// small count for a snappy first response, then sit at the 1000 ceiling.
const SCAN_COUNTS = [100, 500, 1000]

// Hard cap on SCAN round-trips per page fetch. On a large keyspace a type filter
// can match nothing for millions of keys; without this the query loops effectively
// forever. When the budget is spent without finding a key we yield an empty page
// and let the user explicitly continue (see `scan.paused`).
const MAX_SCANS_PER_FETCH = 20

type ScanResult = { cursor: string; keys: { key: string; type: DataType; score?: number }[] }

export const KeysProvider = ({ children }: PropsWithChildren) => {
  const { active, search, valuesSearch, isValuesSearchSelected } = useTab()
  const { data: searchIndexDetails, isLoading: isIndexDetailsLoading } = useFetchSearchIndex(
    valuesSearch.index,
    { enabled: isValuesSearchSelected }
  )

  const { redisNoPipeline: redis } = useRedis()

  const parsedValueQuery = parseJSObjectLiteral(valuesSearch.query)

  const isQueryEnabled =
    active &&
    (isValuesSearchSelected ? Boolean(valuesSearch.index) && Boolean(searchIndexDetails) : true)

  // Redis default key scan
  const redisKeyScan = async ({
    count,
    cursor,
  }: {
    count: number
    cursor: string
  }): Promise<ScanResult> => {
    const args = [cursor]

    if (search.key) {
      args.push("MATCH", search.key)
    }

    if (search.type) {
      args.push("TYPE", search.type)
    }

    args.push("COUNT", count.toString())

    if (!search.type) args.push("WITHTYPE")

    const [newCursor, values] = await redis.exec<[string, string[]]>(["SCAN", ...args])

    // Deserialize keys from the SCAN result
    const keys: { key: string; type: DataType }[] = []
    let index = 0
    while (true) {
      if (search.type) {
        if (index >= values.length) break
        keys.push({ key: values[index], type: search.type as DataType })
        index += 1
      } else {
        if (index + 1 >= values.length) break
        keys.push({ key: values[index], type: values[index + 1] as DataType })
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
    const keys = names.map((name) => ({ key: name, type: "search" as DataType }))

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

    const keys = result.map((doc) => ({
      key: doc.key,
      type: searchIndexDetails.dataType,
      score: doc.score,
    }))

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
        : redisKeyScan

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
    queryKey: [FETCH_KEYS_QUERY_KEY, search, valuesSearch, isValuesSearchSelected],
    enabled: isQueryEnabled,

    initialPageParam: "0",
    queryFn: async ({ pageParam: lastCursor, signal }) => {
      const { cursor, values, scannedKeys, paused } = await scanUntilAvailable(lastCursor, signal)

      const keys: RedisKey[] = values.map((value) => [value.key, value.type, value.score])

      // Save in cache to not send additional requests with useFetchKeyType
      for (const [key, type] of keys) {
        queryClient.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, key], type)
      }

      return {
        cursor: cursor === "0" ? undefined : cursor,
        keys,
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
  })

  const keys = useMemo(() => {
    const keys = query.data?.pages.flatMap((page) => page.keys) ?? []

    // deduplication
    const keysSet = new Set<string>()
    const dedupedKeys: RedisKey[] = []

    for (const key of keys) {
      if (keysSet.has(key[0])) continue

      keysSet.add(key[0])
      dedupedKeys.push(key)
    }
    return dedupedKeys
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
  const { keys } = useKeys()

  const keyTuple = useMemo(() => keys.find(([k, _]) => k === key), [keys, key])

  return keyTuple?.[1]
}
