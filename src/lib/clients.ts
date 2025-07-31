import type { RedisCredentials } from "@/store"
import { MutationCache, QueryCache, QueryClient } from "@tanstack/react-query"
import { Redis } from "@upstash/redis"

import { toast } from "@/components/ui/use-toast"

export const redisClient = ({
  credentials,
  pipelining,
}: {
  credentials?: RedisCredentials
  pipelining: boolean
}) => {
  const safeProcess =
    typeof process === "undefined" ? { env: {} as Record<string, string> } : process
  const token = credentials?.token || safeProcess.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN
  const url = credentials?.url || safeProcess.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL

  if (!url) {
    throw new Error("Redis URL is missing!")
  }
  if (!token) {
    throw new Error("Redis TOKEN is missing!")
  }

  const redis = new Redis({
    url,
    token,
    enableAutoPipelining: pipelining,
    automaticDeserialization: false,
    keepAlive: false,
  })

  return redis
}

const handleError = (error: Error) => {
  let desc = error.message

  // Because the message does not fit in the toast, we only take the
  // first two sentences.
  // Example: "ERR max daily request limit exceeded. Limit: 10000, Usage: 10000."
  if (
    error.name === "UpstashError" &&
    error.message.includes("max daily request limit exceeded.")
  ) {
    desc = error.message.split(".").slice(0, 2).join(".")
  }
  toast({
    variant: "destructive",
    title: "Error",
    description: desc,
  })
  console.error(error)
}

/**
 * @defaultOptions
 * - staleTime: 120000 ms (2 minutes) (Potential adjustment to 3-4 minutes if edge case reported.)
 * - refetchOnWindowFocus: true (Kept true to ensure data is not stale when user switches back to this window.)
 */
export const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      refetchOnWindowFocus: true,
      retry: false,
    },
  },
  queryCache: new QueryCache({
    onError: handleError,
  }),
  mutationCache: new MutationCache({
    onError: handleError,
  }),
})
