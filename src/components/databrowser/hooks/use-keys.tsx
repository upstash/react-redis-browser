import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useRef,
  type PropsWithChildren,
} from "react"
import { useDatabrowserStore } from "@/store"
import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"

import { useFetchKeyType } from "./use-fetch-key-type"
import { useFetchKeys, type RedisKey } from "./use-fetch-keys"

const KeysContext = createContext<
  | {
      keys: RedisKey[]
      query: UseInfiniteQueryResult
      refetch: () => void
    }
  | undefined
>(undefined)

export const FETCH_KEYS_QUERY_KEY = "use-fetch-keys"

export const KeysProvider = ({ children }: PropsWithChildren) => {
  const { search } = useDatabrowserStore()
  const cleanSearchKey = search.key.replace("*", "")

  const { data: exactMatchType } = useFetchKeyType(cleanSearchKey)

  const { fetchKeys, resetCache } = useFetchKeys(search)
  const pageRef = useRef(0)

  const query = useInfiniteQuery({
    queryKey: [FETCH_KEYS_QUERY_KEY, search],

    initialPageParam: 0,
    queryFn: async ({ pageParam: page }) => {
      // We should reset the cache when the pagination is reset
      if (pageRef.current >= page) resetCache()
      pageRef.current = page

      return await fetchKeys()
    },
    select: (data) => data,
    getNextPageParam: (lastPage, __, lastPageIndex) => {
      return lastPage.hasNextPage ? lastPageIndex + 1 : undefined
    },
    refetchOnMount: false,
  })

  const refetch = useCallback(() => {
    resetCache()
    query.refetch()
  }, [query, resetCache])

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
        query,
        refetch,
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
