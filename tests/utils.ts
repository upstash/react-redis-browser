import type { Page } from "@playwright/test"
import { Redis } from "@upstash/redis"

export const redis = Redis.fromEnv()

/**
 * Key to check if the database is modified
 *
 * If the key exists, the database is not modified
 */
const IS_ORIGINAL_KEY = "---is-original"

export const setup = async (page: Page) => {
  page.addInitScript(() => {
    ;(window as any).__PLAYWRIGHT__ = true
  })

  // Fail fast on browser-side errors instead of waiting for timeouts
  page.on("pageerror", (error) => {
    throw error
  })
  page.on("console", (msg) => {
    if (msg.type() === "error") {
      throw new Error(`Console error: ${msg.text()}`)
    }
  })

  const isOriginal = await redis.exists(IS_ORIGINAL_KEY)

  if (!isOriginal) {
    await fillDummyData()
    await redis.set(IS_ORIGINAL_KEY, true)
  }
}

export const markDatabaseAsModified = async () => {
  await redis.del(IS_ORIGINAL_KEY)
}

const fillDummyData = async () => {
  const pipeline = redis.pipeline()

  pipeline.flushdb()
  pipeline.set("-mykey", "myvalue")

  const COUNT = 100

  for (let i = 0; i < COUNT; i++) {
    pipeline.set(`mykey-${i}`, `value-${i}`)
  }

  const array = Array.from({ length: COUNT }, (_, i) => i)

  pipeline.zadd(
    `myzset`,
    { score: 0, member: "" },
    ...array.map((i) => ({ score: i, member: `value-${i}` }))
  )
  pipeline.lpush(`mylist`, ...array.map((i) => `value-${i}`))
  const hashFields = array.reduce(
    (acc, i) => {
      acc[`field-${i}`] = `value-${i}`
      return acc
    },
    {} as Record<string, string>
  )

  pipeline.hset(`myhash`, hashFields)

  // Add entries to the stream one by one
  for (const i of array) {
    pipeline.xadd(`mystream`, `*`, { index: i, foo: `bar`, age: 42, name: `what` })
  }
  pipeline.json.set(`myjson`, `$`, {
    foo: `bar`,
    age: 42,
    name: `what`,
    more: { and: { more: { nested: { thing: 42 } } } },
  })

  const timeStart = Date.now()
  await pipeline.exec()

  // eslint-disable-next-line no-console
  console.log("Filled dummy data in", Date.now() - timeStart, "ms")
}
