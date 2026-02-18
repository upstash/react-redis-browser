import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import { IconLoader2 } from "@tabler/icons-react"
import { useMutation, useQueryClient } from "@tanstack/react-query"

import { FETCH_KEYS_QUERY_KEY } from "../../hooks/use-keys"

export const ReindexButton = () => {
  const { redisNoPipeline: redis } = useRedis()
  const {
    valuesSearch: { index },
  } = useTab()
  const queryClient = useQueryClient()

  const { mutate, isPending } = useMutation({
    mutationFn: async () => {
      if (!index) return
      await redis.search.index({ name: index }).waitIndexing()
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: [FETCH_KEYS_QUERY_KEY] })
    },
  })

  return (
    <button
      onClick={() => mutate()}
      disabled={!index || isPending}
      className="flex items-center gap-1 text-xs text-zinc-500 transition-colors hover:text-zinc-700 disabled:opacity-50"
    >
      {isPending && <IconLoader2 className="size-3 animate-spin" />}
      Reindex
    </button>
  )
}
