import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import type { Redis } from "@upstash/redis/cloudflare"

import { redisClient } from "./lib/clients"

export type RedisCredentials = {
  url?: string
  token?: string
}

type RedisContextProps = {
  redis: Redis
  redisNoPipeline: Redis
}

const RedisContext = createContext<RedisContextProps | undefined>(undefined)

export type RedisProviderProps = {
  redisCredentials: RedisCredentials
  telemetry: boolean
}

export const RedisProvider = ({
  children,
  redisCredentials,
  telemetry,
}: PropsWithChildren<RedisProviderProps>) => {
  const redisInstance = useMemo(
    () => redisClient({ credentials: redisCredentials, pipelining: true, telemetry }),
    [redisCredentials, telemetry]
  )
  const redisInstanceNoPipeline = useMemo(
    () => redisClient({ credentials: redisCredentials, pipelining: false, telemetry }),
    [redisCredentials, telemetry]
  )

  return (
    <RedisContext.Provider
      value={{ redis: redisInstance, redisNoPipeline: redisInstanceNoPipeline }}
    >
      {children}
    </RedisContext.Provider>
  )
}

export const useRedis = (): RedisContextProps => {
  const context = useContext(RedisContext)
  if (!context) {
    throw new Error("useRedis must be used within a RedisProvider")
  }
  return context
}
