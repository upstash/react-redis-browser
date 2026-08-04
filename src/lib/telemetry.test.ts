import { afterEach, beforeEach, describe, expect, test } from "bun:test"

import { VERSION } from "../version"
import { addTelemetry } from "./telemetry"

const createRedisMock = () => {
  const calls: { sdk?: string }[] = []
  return {
    calls,
    client: {
      addTelemetry: (telemetry: { sdk?: string }) => {
        calls.push(telemetry)
      },
    },
  }
}

describe("addTelemetry", () => {
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

  test("sends the sdk name and version", () => {
    const { client, calls } = createRedisMock()
    addTelemetry(client)

    expect(calls).toEqual([{ sdk: `@upstash/react-redis-browser@${VERSION}` }])
  })

  test("tags a client only once", () => {
    const { client, calls } = createRedisMock()
    addTelemetry(client)
    addTelemetry(client)

    expect(calls.length).toBe(1)
  })

  test("respects enableTelemetry: false", () => {
    const { client, calls } = createRedisMock()
    addTelemetry(client, false)

    expect(calls.length).toBe(0)
  })

  test("respects UPSTASH_DISABLE_TELEMETRY", () => {
    process.env.UPSTASH_DISABLE_TELEMETRY = "1"
    const { client, calls } = createRedisMock()
    addTelemetry(client)

    expect(calls.length).toBe(0)
  })

  test("does not throw on clients without addTelemetry", () => {
    expect(() => addTelemetry({})).not.toThrow()
    expect(() => addTelemetry(null)).not.toThrow()
  })

  test("does not throw when addTelemetry throws", () => {
    const client = {
      addTelemetry: () => {
        throw new Error("boom")
      },
    }

    expect(() => addTelemetry(client)).not.toThrow()
  })
})
