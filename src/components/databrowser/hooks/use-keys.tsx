import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { useDatabrowser, useDatabrowserStore } from "@/store"
import type { DataType, RedisKey } from "@/types"
import { useInfiniteQuery, type UseInfiniteQueryResult } from "@tanstack/react-query"

const KeysContext = createContext<
  | {
      keys: RedisKey[]
      query: UseInfiniteQueryResult
    }
  | undefined
>(undefined)

export const FETCH_KEYS_QUERY_KEY = "use-fetch-keys"

const SCAN_COUNT = 100

export const KeysProvider = ({ children }: PropsWithChildren) => {
  const { search } = useDatabrowserStore()

  const { redisNoPipeline: redis } = useDatabrowser()

  const query = useInfiniteQuery({
    queryKey: [FETCH_KEYS_QUERY_KEY, search],

    initialPageParam: "0",
    queryFn: async ({ pageParam: lastCursor }) => {
      // We should reset the cache when the pagination is reset

      const args = [lastCursor]

      if (search.key) {
        args.push("MATCH", search.key)
      }

      if (search.type) {
        args.push("TYPE", search.type)
      }

      args.push("COUNT", SCAN_COUNT.toString())

      if (!search.type) args.push("WITHTYPE")

      const [cursor, values] = await redis.exec<[string, string[]]>(["SCAN", ...args])
      const keys: RedisKey[] = []

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
