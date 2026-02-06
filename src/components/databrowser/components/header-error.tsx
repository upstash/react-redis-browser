import { formatUpstashErrorMessage } from "@/lib/utils"

import { useKeys } from "../hooks"

export const HeaderError = () => {
  const { query } = useKeys()

  if (!query.error) return null

  return (
    <p className="text-sm text-red-600 dark:text-red-400">
      {formatUpstashErrorMessage(query.error)}
    </p>
  )
}
