/* eslint-disable no-console */
import { Redis } from "@upstash/redis"

const redis = new Redis({
  url: process.env.UPSTASH_REDIS_REST_URL!,
  token: process.env.UPSTASH_REDIS_REST_TOKEN!,
})

const COUNT = 200

for (let i = 1; i <= COUNT; i++) {
  const name = `test-index-${String(i).padStart(3, "0")}`
  try {
    await redis.search.createIndex({
      name,
      dataType: "hash",
      prefix: [`${name}:`],
      schema: { title: "TEXT" },
    })
    console.log(`[${i}/${COUNT}] created ${name}`)
  } catch (error) {
    console.error(`[${i}/${COUNT}] failed ${name}:`, error)
  }
}

console.log("done")
