import { useDatabrowser } from "@/store"
import type { ListDataType } from "@/types"
import { useInfiniteQuery } from "@tanstack/react-query"

export const LIST_DISPLAY_PAGE_SIZE = 50

export const FETCH_LIST_ITEMS_QUERY_KEY = "use-fetch-list-items"

export const useFetchListItems = ({ dataKey, type }: { dataKey: string; type: ListDataType }) => {
  const { redisNoPipeline: redis } = useDatabrowser()

  const setQuery = useInfiniteQuery({
    enabled: type === "set",
    queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, dataKey, "set"],
    initialPageParam: "0",
    queryFn: async ({ pageParam: cursor }) => {
      const [nextCursor, keys] = await redis.sscan(dataKey, cursor, {
        count: LIST_DISPLAY_PAGE_SIZE,
      })

      return {
        cursor: nextCursor === "0" ? undefined : nextCursor,
        keys: (keys as string[]).map((key) => ({ key })),
      }
    },

    getNextPageParam: ({ cursor }) => cursor,
  })

  const zsetQuery = useInfiniteQuery({
    enabled: type === "zset",
    queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, dataKey, "zset"],
    initialPageParam: 0,
    queryFn: async ({ pageParam: page }) => {
      const start = page * LIST_DISPLAY_PAGE_SIZE
      const end = start + LIST_DISPLAY_PAGE_SIZE - 1

      const res = await redis.zrange(dataKey, start, end, {
        withScores: true,
        rev: true,
      })

      return {
        cursor: res.length < LIST_DISPLAY_PAGE_SIZE ? undefined : page + 1,
        keys: transformArray(res as any),
      }
    },

    getNextPageParam: ({ cursor }) => cursor,
  })

  const hashQuery = useInfiniteQuery({
    enabled: type === "hash",
    queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, dataKey, "hash"],
    initialPageParam: "0",
    queryFn: async ({ pageParam: cursor }) => {
      const res = await redis.hscan(dataKey, cursor, {
        count: LIST_DISPLAY_PAGE_SIZE,
      })

      return {
        cursor: res[0] === "0" ? undefined : res[0],
        keys: transformArray(res[1]),
      }
    },

    getNextPageParam: ({ cursor }) => cursor,
  })

  const listQuery = useInfiniteQuery({
    enabled: type === "list",
    queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, dataKey, "list"],
    initialPageParam: 0,
    queryFn: async ({ pageParam: page }) => {
      const start = page * LIST_DISPLAY_PAGE_SIZE
      const end = start + LIST_DISPLAY_PAGE_SIZE - 1

      const values = await redis.lrange(dataKey, start, end)

      return {
        cursor: values.length < LIST_DISPLAY_PAGE_SIZE ? undefined : page + 1,
        keys: values.map((value, i) => ({
          key: (start + i).toString(),
          value,
        })),
      }
    },

    getNextPageParam: ({ cursor }) => cursor,
  })

  const streamQuery = useInfiniteQuery({
    enabled: type === "stream",
    queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, dataKey, "stream"],
    initialPageParam: "-",
    queryFn: async ({ pageParam: lastId }) => {
      const messages = (await redis.xrange(
        dataKey,
        lastId === "-" ? "-" : `(${lastId}`,
        "+",
        // +1 since first message is the last one
        LIST_DISPLAY_PAGE_SIZE + 1
      )) as unknown as [string, string[]][]

      const lastMessageId = messages.length > 0 ? messages.at(-1)?.[0] : undefined

      return {
        cursor: messages.length < LIST_DISPLAY_PAGE_SIZE ? undefined : lastMessageId,
        keys: messages.map(([id, fields]) => ({
          key: id,
          value: fields.join("\n"),
        })),
      }
    },

    getNextPageParam: ({ cursor }) => cursor,
  })

  const map = {
    set: setQuery,
    zset: zsetQuery,
    hash: hashQuery,
    list: listQuery,
    stream: streamQuery,
  }

  return map[type]
}

export function transformArray(inputArray: (string | number)[]) {
  if (inputArray.length % 2 !== 0) {
    throw new Error("The input array length must be even.")
  }

  return inputArray.reduce<
    {
      key: string
      value: string
    }[]
  >((acc, curr, idx, src) => {
    if (idx % 2 === 0) {
      acc.push({ key: String(curr), value: String(src[idx + 1]) })
    }
    return acc
  }, [])
}
