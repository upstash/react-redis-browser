import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { describe, expect, test } from "bun:test"

import { FETCH_KEYS_QUERY_KEY } from "../../hooks"
import { FETCH_KEY_LENGTH_QUERY_KEY } from "../../hooks/use-fetch-key-length"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"
import { invalidateAll } from "./refresh-button"

const LENGTH_KEY = [FETCH_KEY_LENGTH_QUERY_KEY, "k", "set"]

/**
 * `k` is displayed as a set. On refresh, the server reports `typeAfterRefresh` for it, and the
 * scan only returns it when `inScan` (a type filter or search can leave it out).
 */
const setup = async ({
  typeAfterRefresh,
  inScan,
}: {
  typeAfterRefresh: string
  inScan: boolean
}) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const events: string[] = []
  let scans = 0

  const keysObserver = new QueryObserver(client, {
    queryKey: [FETCH_KEYS_QUERY_KEY],
    queryFn: async () => {
      const keys = scans++ === 0 ? [["k", "set"]] : inScan ? [["k", typeAfterRefresh]] : []
      await new Promise((resolve) => setTimeout(resolve, 5))
      // Like the real scan, cache the type of every returned key
      for (const [key, type] of keys) client.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, key], type)
      events.push("scan")
      return keys
    },
  })
  const lengthObserver = new QueryObserver(client, {
    queryKey: LENGTH_KEY,
    queryFn: async () => {
      events.push("scard")
      return 1
    },
  })
  const unsubscribers = [keysObserver, lengthObserver].map((observer) =>
    observer.subscribe(() => {})
  )
  await new Promise<void>((resolve) => {
    const check = () => (client.isFetching() === 0 ? resolve() : setTimeout(check, 1))
    check()
  })
  events.length = 0

  const redis = {
    type: async (key: string) => {
      events.push(`type:${key}`)
      return typeAfterRefresh
    },
  }
  const refresh = () => invalidateAll(redis as Parameters<typeof invalidateAll>[0], client)
  const unsubscribe = () => {
    for (const fn of unsubscribers) fn()
  }
  return { client, events, refresh, unsubscribe }
}

describe("invalidateAll", () => {
  test("refetches a type dependent query when the key type is unchanged", async () => {
    const { events, refresh, unsubscribe } = await setup({ typeAfterRefresh: "set", inScan: true })
    await refresh()
    expect(events).toContain("scard")
    expect(events.indexOf("type:k")).toBeLessThan(events.indexOf("scard"))
    unsubscribe()
  })

  test("does not run the old type's command when the key type changed", async () => {
    for (const inScan of [true, false]) {
      const { client, events, refresh, unsubscribe } = await setup({
        typeAfterRefresh: "hash",
        inScan,
      })
      await refresh()
      expect(events).not.toContain("scard")
      expect(client.getQueryState(LENGTH_KEY)?.isInvalidated).toBe(true)
      unsubscribe()
    }
  })

  test("does not refetch a type dependent query for a deleted key", async () => {
    const { events, refresh, unsubscribe } = await setup({
      typeAfterRefresh: "none",
      inScan: false,
    })
    await refresh()
    expect(events).not.toContain("scard")
    unsubscribe()
  })
})
