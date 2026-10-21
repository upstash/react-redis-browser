import { QueryClient, QueryObserver } from "@tanstack/react-query"
import { describe, expect, test } from "bun:test"

import { FETCH_KEYS_QUERY_KEY } from "../../hooks"
import { FETCH_KEY_LENGTH_QUERY_KEY } from "../../hooks/use-fetch-key-length"
import { FETCH_KEY_TYPE_QUERY_KEY } from "../../hooks/use-fetch-key-type"
import { invalidateAll } from "./refresh-button"

const setup = (typeAfterRefresh: string) => {
  const client = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const events: string[] = []
  let scans = 0

  // Mimics the key scan, which writes the type of every scanned key into the type cache
  const keysObserver = new QueryObserver(client, {
    queryKey: [FETCH_KEYS_QUERY_KEY],
    queryFn: async () => {
      const type = scans++ === 0 ? "set" : typeAfterRefresh
      await new Promise((resolve) => setTimeout(resolve, 5))
      client.setQueryData([FETCH_KEY_TYPE_QUERY_KEY, "k"], type)
      events.push(`scan:${type}`)
      return [["k", type]]
    },
  })

  // Mimics the length badge while the key is displayed as a set
  const lengthObserver = new QueryObserver(client, {
    queryKey: [FETCH_KEY_LENGTH_QUERY_KEY, "k", "set"],
    queryFn: async () => {
      events.push("scard")
      return 1
    },
  })

  const unsubscribers = [keysObserver, lengthObserver].map((observer) =>
    observer.subscribe(() => {})
  )
  const unsubscribe = () => {
    for (const fn of unsubscribers) fn()
  }
  return { client, events, unsubscribe }
}

const waitForInitialFetches = (client: QueryClient) =>
  new Promise<void>((resolve) => {
    const check = () => (client.isFetching() === 0 ? resolve() : setTimeout(check, 1))
    check()
  })

describe("invalidateAll", () => {
  test("does not refetch a type dependent query when the key type changed", async () => {
    const { client, events, unsubscribe } = setup("hash")
    await waitForInitialFetches(client)
    events.length = 0

    await invalidateAll(client)

    expect(events).toEqual(["scan:hash"])
    expect(client.getQueryState([FETCH_KEY_LENGTH_QUERY_KEY, "k", "set"])?.isInvalidated).toBe(true)
    unsubscribe()
  })

  test("refetches a type dependent query after the scan when the type is unchanged", async () => {
    const { client, events, unsubscribe } = setup("set")
    await waitForInitialFetches(client)
    events.length = 0

    await invalidateAll(client)

    expect(events).toEqual(["scan:set", "scard"])
    unsubscribe()
  })
})
