import { VERSION } from "../version"

/**
 * Minimal shape of the redis client we need for telemetry. `addTelemetry` is
 * `protected` in `@upstash/redis`, so it is not part of the public types.
 */
type TelemetryCapableRedis = {
  addTelemetry?: (telemetry: { sdk?: string; platform?: string; runtime?: string }) => void
}

/**
 * The redis client appends to the telemetry header on every addTelemetry call,
 * so tag each client only once no matter how often it is passed here.
 */
const taggedClients = new WeakSet<object>()

/** Browser-safe access to `process.env`, returns an empty object when there is no `process`. */
export const getSafeEnv = (): Record<string, string | undefined> =>
  typeof process === "object" && process && typeof process.env === "object" ? process.env : {}

/**
 * Reports the sdk name and version to Upstash through the redis client's
 * telemetry headers. The redis client itself already reports the platform and
 * the runtime, so we only append our own sdk tag, resulting in a header like
 * `@upstash/redis@1.35.0,@upstash/react-redis-browser@0.4.0`.
 *
 * Opt out with the `disableTelemetry` prop on `RedisBrowser` or with the
 * `UPSTASH_DISABLE_TELEMETRY` env var.
 */
export const addTelemetry = (redis: unknown, enableTelemetry = true): void => {
  if (!enableTelemetry || getSafeEnv().UPSTASH_DISABLE_TELEMETRY) return
  if (!redis || typeof redis !== "object") return
  if (taggedClients.has(redis)) return
  taggedClients.add(redis)

  try {
    const client = redis as TelemetryCapableRedis
    // addTelemetry is intentionally hidden from the public types of @upstash/redis
    client.addTelemetry?.({ sdk: `@upstash/react-redis-browser@${VERSION}` })
  } catch {
    // telemetry must never break the client
  }
}
