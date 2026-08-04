import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { VERSION } from "../version"
import { redisClient } from "./clients"

const credentials = {
  url: "https://example-test.upstash.io",
  token: "test-token",
}

/**
 * The redis client keeps its telemetry state in the `Upstash-Telemetry-Sdk`
 * header of its internal http client. No request is sent at construction time,
 * so reading the header is a safe, offline assertion on the real client.
 */
const getSdkTelemetryHeader = (redis: unknown): string | undefined =>
  (redis as { client?: { headers?: Record<string, string> } }).client?.headers?.[
    "Upstash-Telemetry-Sdk"
  ]

describe("redisClient telemetry wiring", () => {
  // Bun auto-loads .env, so the developer's or the CI runner's real
  // UPSTASH_DISABLE_TELEMETRY must be snapshotted and restored around each test.
  let originalDisableTelemetry: string | undefined

  beforeEach(() => {
    originalDisableTelemetry = process.env.UPSTASH_DISABLE_TELEMETRY
    delete process.env.UPSTASH_DISABLE_TELEMETRY
  })

  afterEach(() => {
    if (originalDisableTelemetry === undefined) {
      delete process.env.UPSTASH_DISABLE_TELEMETRY
    } else {
      process.env.UPSTASH_DISABLE_TELEMETRY = originalDisableTelemetry
    }
  })

  test("tags the client with the sdk name and version", () => {
    const redis = redisClient({ credentials, pipelining: false, telemetry: true })

    const header = getSdkTelemetryHeader(redis)
    expect(header).toContain(`@upstash/react-redis-browser@${VERSION}`)
    // the base redis sdk tag must be preserved, not replaced
    expect(header).toContain("@upstash/redis@")
  })

  test("tags the client behind the auto-pipelining proxy", () => {
    const redis = redisClient({ credentials, pipelining: true, telemetry: true })

    const header = getSdkTelemetryHeader(redis)
    expect(header).toContain(`@upstash/react-redis-browser@${VERSION}`)
    expect(header).toContain("@upstash/redis@")
  })

  test("telemetry: false suppresses the telemetry header entirely", () => {
    const redis = redisClient({ credentials, pipelining: false, telemetry: false })

    expect(getSdkTelemetryHeader(redis)).toBeUndefined()
  })

  test("UPSTASH_DISABLE_TELEMETRY also disables the base redis telemetry", () => {
    process.env.UPSTASH_DISABLE_TELEMETRY = "1"
    const redis = redisClient({ credentials, pipelining: false, telemetry: true })

    expect(getSdkTelemetryHeader(redis)).toBeUndefined()
  })
})
