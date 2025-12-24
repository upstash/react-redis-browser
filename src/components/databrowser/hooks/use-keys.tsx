import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import type { DataType, RedisKey } from "@/types"
import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { FETCH_KEY_TYPE_QUERY_KEY } from "./use-fetch-key-type"

const KeysContext = createContext<
  | {
      keys: RedisKey[]
      query: UseInfiniteQueryResult
    }
  | undefined
>(undefined)

export const FETCH_KEYS_QUERY_KEY = "use-fetch-keys"

const SCAN_COUNTS = [100, 300, 500]

export const KeysProvider = ({ children }: PropsWithChildren) => {
  const { active, search } = useTab()

  const { redisNoPipeline: redis } = useRedis()

  const performScan = async (count: number, cursor: string) => {
    const args = [cursor]

    if (search.key) {
      args.push("MATCH", search.key)
    }

    if (search.type) {
      args.push("TYPE", search.type)
    }

    args.push("COUNT", count.toString())

    if (!search.type) args.push("WITHTYPE")

    return await redis.exec<[string, string[]]>(["SCAN", ...args])
  }

  /**
   * Keeps scanning until a result shows up.
   *
   * When a db is sparse and the type argument is used, it could take a lot of
   * requests to find those sparse keys. Best method is to increase the count
   * argument when no result is being returned to decrease the number of
   * requests.
   */
  const scanUntilAvailable = async (cursor: string) => {
    let i = 0
    while (true) {
      const [newCursor, values] = await performScan(SCAN_COUNTS[i] ?? SCAN_COUNTS.at(-1), cursor)
      cursor = newCursor
      i++

      if (values.length > 0 || cursor === "0") {
        return [cursor, values] as const
      }
    }
  }

  const query = useInfiniteQuery({
    queryKey: [FETCH_KEYS_QUERY_KEY, search],
    // Only fetch when tab is active
    enabled: active,

    initialPageParam: "0",
    queryFn: async ({ pageParam: lastCursor }) => {
      const [cursor, values] = await scanUntilAvailable(lastCursor)

      const keys: RedisKey[] = []

      // Deserialize keys
      let index = 0
      while (true) {
        if (search.type) {
          if (index >= values.length) break
          keys.push([values[index], search.type as DataType])
          index += 1
        } else {
          if (index + 1 >= values.length) break
          keys.push([values[index], values[index + 1] as DataType])
          index += 2
        }
      }

      // Save in cache to not send additional requests with useFetchKeyType
      for (const [key, type] of keys) {
        queryClient.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, key], type)
      }

      return {
        cursor: cursor === "0" ? undefined : cursor,
        keys,
        hasNextPage: cursor !== "0",
      }
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

  return (
    <KeysContext.Provider
      value={{
        keys,
        query,
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
