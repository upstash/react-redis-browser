import { useRedis } from "@/redis-context"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { useMutation } from "@tanstack/react-query"

import { useDeleteKeyCache } from "./use-delete-key-cache"

export const useDeleteKey = () => {
  const { redis, redisNoPipeline } = useRedis()
  const { deleteKeyCache } = useDeleteKeyCache()
  const { isValuesSearchSelected, valuesSearch } = useTab()
  const { deselectKeys } = useDatabrowserStore()

  const deleteKey = useMutation({
    mutationFn: async ({ keys, reindex }: { keys: string[]; reindex?: boolean }) => {
      await Promise.all(keys.map((key) => redis.del(key)))

      if (reindex && isValuesSearchSelected && valuesSearch.index) {
        await redisNoPipeline.search.index({ name: valuesSearch.index }).waitIndexing()
      }
    },
    onSuccess: (_, { keys }) => {
      for (const key of keys) {
        deleteKeyCache(key)
      }

      // Drop deleted keys from selections so later actions don't include them
      deselectKeys(keys)
    },
  })

  return deleteKey
}
