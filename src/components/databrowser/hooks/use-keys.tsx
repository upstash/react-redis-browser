import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { useDatabrowser, useDatabrowserStore } from "@/store"
import type { DataType, RedisKey } from "@/types"
import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"

import { useFetchKeyType } from "./use-fetch-key-type"

const KeysContext = createContext<
  | {
      keys: RedisKey[]
      query: UseInfiniteQueryResult
      refetch: () => void
    }
  | undefined
>(undefined)

export const FETCH_KEYS_QUERY_KEY = "use-fetch-keys"

const SCAN_COUNT = 100

export const KeysProvider = ({ children }: PropsWithChildren) => {
  const { search } = useDatabrowserStore()
  const cleanSearchKey = search.key.replace("*", "")

  const { data: exactMatchType, isFetching, isLoading } = useFetchKeyType(cleanSearchKey)
  const { redisNoPipeline: redis } = useDatabrowser()

  const query = useInfiniteQuery({
    queryKey: [FETCH_KEYS_QUERY_KEY, search],

    initialPageParam: "0",
    queryFn: async ({ pageParam: lastCursor }) => {
      // We should reset the cache when the pagination is reset

      const args = [lastCursor]

      if (cleanSearchKey) {
        args.push("MATCH", cleanSearchKey)
      }

      if (search.type) {
        args.push("TYPE", search.type)
      }

      args.push("COUNT", SCAN_COUNT.toString())

      if (!search.type) args.push("WITHTYPE")

      const [cursor, values] = await redis.exec<[string, string[]]>(["SCAN", ...args])
      const keys: RedisKey[] = []

      let index = 0
      while (index + 1 < values.length) {
        if (search.type) {
          keys.push([values[index], search.type as DataType])
          index += 1
        } else {
          keys.push([values[index], values[index + 1] as DataType])
          index += 2
        }
      }

      return {
        cursor: cursor === "0" ? undefined : cursor,
        keys,
        hasNextPage: cursor !== "0",
      }
    },
    select: (data) => data,
    getNextPageParam: ({ cursor }) => cursor,
    enabled: !isFetching,
    refetchOnMount: false,
  })

  const keys = useMemo(() => {
    const keys = query.data?.pages.flatMap((page) => page.keys) ?? []

    // Include the exact match if it exists before SCAN returns
    if (
      exactMatchType &&
      exactMatchType !== "none" &&
      (search.type === undefined || search.type === exactMatchType)
    ) {
      keys.push([cleanSearchKey, exactMatchType])
    }

    // deduplication
    const keysSet = new Set<string>()
    const dedupedKeys: RedisKey[] = []

    for (const key of keys) {
      if (keysSet.has(key[0])) continue

      keysSet.add(key[0])
      dedupedKeys.push(key)
    }
    return dedupedKeys
  }, [query.data, cleanSearchKey, exactMatchType])

  return (
    <KeysContext.Provider
      value={{
        keys,
        // @ts-expect-error Ignore the error with spread syntax
        query: {
          ...query,
          isLoading: isLoading || query.isLoading,
          isFetching: isFetching || query.isFetching,
        },
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
