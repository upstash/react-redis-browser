import { useCallback, useRef } from "react"
import { useDatabrowser, type SearchFilter } from "@/store"
import { DATA_TYPES, type DataType } from "@/types"
import type { Redis } from "@upstash/redis"

const PAGE_SIZE = 30

const FETCH_COUNTS = [100, 200, 400, 800]

export type RedisKey = [string, DataType]

export const useFetchKeys = (search: SearchFilter) => {
  const { redisNoPipeline: redis } = useDatabrowser()

  const cache = useRef<PaginationCache | undefined>()
  const lastKey = useRef<string | undefined>()

  const fetchKeys = useCallback(() => {
    const newKey = JSON.stringify(search)

    if (!cache.current || lastKey.current !== newKey) {
      cache.current = new PaginationCache(redis, search.key, search.type)
      lastKey.current = newKey
    }

    return cache.current.fetchNewKeys()
  }, [search])

  const resetCache = useCallback(() => {
    cache.current = undefined
    lastKey.current = undefined
  }, [])

  return {
    fetchKeys,
    resetCache,
  }
}

class PaginationCache {
  // Cursor is 0 initially, then it is set to -1 when we reach the end
  cache: Record<string, { cursor: string; keys: string[] }> = Object.fromEntries(
    DATA_TYPES.map((type) => [type, { cursor: "0", keys: [] }])
  )
  targetCount = 0
  isFetching = false

  constructor(
    private readonly redis: Redis,
    private readonly searchTerm: string,
    private readonly typeFilter: string | undefined
  ) {
    if (typeFilter && !DATA_TYPES.includes(typeFilter as DataType)) {
      throw new Error(`Invalid type filter: ${typeFilter}`)
    }
  }

  async fetchNewKeys() {
    const initialKeys = new Set(this.getKeys().map(([key]) => key))
    // The number of keys we need to have in the cache to satisfy this function call
    this.targetCount = this.getKeys().length + PAGE_SIZE

    // Starts the fetching loop if it's not already started
    void this.startFetch()

    // Wait until we have enough
    await new Promise<void>((resolve) => {
      const interval = setInterval(() => {
        if (this.getLength() >= this.targetCount || this.isAllEnded()) {
          clearInterval(interval)
          resolve()
        }
      }, 100)
    })

    const hasNextPage = !this.isAllEnded()

    return {
      keys: this.getKeys().filter(([key]) => !initialKeys.has(key)),
      hasNextPage,
    }
  }

  private getLength() {
    return Object.values(this.cache).reduce((acc, curr) => acc + curr.keys.length, 0)
  }

  private getKeys() {
    const keys = Object.entries(this.cache).flatMap(([type, { keys }]) => {
      return keys.map((key) => [key, type] as RedisKey)
    })

    const sorted = keys.sort((a, b) => a[0].localeCompare(b[0]))

    return sorted
  }

  private async startFetch() {
    if (this.isFetching) {
      return
    }
    this.isFetching = true
    try {
      await this.fetch()
    } finally {
      this.isFetching = false
    }
  }

  private fetchForType = async (type: string) => {
    let i = 0

    while (true) {
      const cursor = this.cache[type].cursor
      if (cursor === "-1" || this.getLength() >= this.targetCount) {
        break
      }

      const fetchCount = FETCH_COUNTS[Math.min(i, FETCH_COUNTS.length - 1)]

      const [nextCursor, newKeys] = await this.redis.scan(cursor, {
        count: fetchCount,
        match: this.searchTerm,
        type: type,
      })

      this.cache[type].keys = [...this.cache[type].keys, ...newKeys]
      this.cache[type].cursor = nextCursor === "0" ? "-1" : nextCursor
      i++
    }
  }

  private async fetch() {
    // Fetch pages of each type until we have enough
    const types = this.typeFilter ? [this.typeFilter] : DATA_TYPES
    await Promise.all(types.map(this.fetchForType))
  }

  private isAllEnded(): boolean {
    const types = this.typeFilter ? [this.typeFilter] : DATA_TYPES

    return types.every((type) => this.cache[type] && this.cache[type].cursor === "-1")
  }
}
