import { useCallback } from "react"
import { useTab } from "@/tab-provider"

import { queryClient } from "@/lib/clients"

import { FETCH_KEY_TYPE_QUERY_KEY } from "./use-fetch-key-type"
import { FETCH_LIST_ITEMS_QUERY_KEY } from "./use-fetch-list-items"
import { FETCH_SIMPLE_KEY_QUERY_KEY } from "./use-fetch-simple-key"
import { FETCH_KEYS_QUERY_KEY } from "./use-keys"

export const useDeleteKeyCache = () => {
  const { setSelectedKey } = useTab()

  const deleteKeyCache = useCallback(
    (key: string) => {
      setSelectedKey(undefined)
      queryClient.invalidateQueries({
        queryKey: [FETCH_KEYS_QUERY_KEY],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_SIMPLE_KEY_QUERY_KEY, key],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_LIST_ITEMS_QUERY_KEY, key],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_KEY_TYPE_QUERY_KEY, key],
      })
    },
    [setSelectedKey]
  )

  return { deleteKeyCache }
}
