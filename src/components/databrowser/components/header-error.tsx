import { useKeys } from "../hooks"

/**
 * Formats an UpstashError message by stripping the "command was: ..." suffix.
 */
const formatUpstashErrorMessage = (error: Error): string => {
  if (error.name !== "UpstashError") return error.message

  // Strip "command was: [...]" suffix
  const commandIndex = error.message.indexOf(", command was:")
  if (commandIndex !== -1) {
    return error.message.slice(0, commandIndex)
  }
  return error.message
}

export const HeaderError = () => {
  const { query } = useKeys()

  if (!query.error) return null

  return (
    <p className="text-sm text-red-600 dark:text-red-400">
      {formatUpstashErrorMessage(query.error)}
    </p>
  )
}
