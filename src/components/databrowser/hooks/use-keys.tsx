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
  const { search: searchState } = useDatabrowserStore()

  const search = useMemo(
    () => ({
      key: searchState.key.includes("*") ? searchState.key : `*${searchState.key}*`,
      type: searchState.type,
    }),
    [searchState]
  )

  const { fetchKeys, resetCache } = useFetchKeys(search)
  const pageRef = useRef(0)

  const query = useInfiniteQuery({
    queryKey: [FETCH_KEYS_QUERY_KEY, search],

    initialPageParam: 0,
    queryFn: async ({ pageParam: page }) => {
      // We should reset the cache when the pagination is reset
      if (pageRef.current > page) resetCache()
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
