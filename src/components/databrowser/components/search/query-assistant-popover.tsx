import { useState } from "react"
import { useRedis } from "@/redis-context"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"

import type { UseQueryWizard } from "@/types/query-wizard"
import { Button } from "@/components/ui/button"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { useGenerateQuery } from "../../hooks/use-generate-query"
import { AiAccessRequired } from "./ai-access-required"
import { AiConsentDialog } from "./ai-consent-dialog"

type ErrorType = "auth" | "ratelimit" | "generic"

const getErrorType = (errorMessage: string): ErrorType => {
  if (errorMessage.toLowerCase().includes("authentication")) {
    return "auth"
  }
  if (
    errorMessage.toLowerCase().includes("too many requests") ||
    errorMessage.toLowerCase().includes("rate limit")
  ) {
    return "ratelimit"
  }
  return "generic"
}

export const QueryAssistantPopover = ({
  onClose,
  useQueryWizard,
}: {
  onClose?: () => void
  useQueryWizard?: UseQueryWizard
}) => {
  const { valuesSearch, setValuesSearchQuery, setQueryBuilderMode } = useTab()
  const { redisNoPipeline: redis } = useRedis()
  const [input, setInput] = useState("")
  const [sampleData, setSampleData] = useState<any[]>([])

  const store = useDatabrowserStore()
  const aiDataSharingConsent = store.aiDataSharingConsent

  const { data: indexData, isLoading: isLoadingIndex } = useFetchSearchIndex(valuesSearch.index)
  const generateQuery = useGenerateQuery(useQueryWizard)

  const handleGenerate = async () => {
    if (!input.trim() || !valuesSearch.index) return

    try {
      // Fetch sample data if not already loaded
      let samples = sampleData
      if (samples.length === 0 && indexData?.prefixes?.[0]) {
        try {
          const keys = await redis.keys(`${indexData.prefixes[0]}*`)
          const firstTenKeys = keys.slice(0, 10)

          const dataPromises = firstTenKeys.map(async (key) => {
            try {
              if (indexData.dataType === "json") {
                const data = await redis.json.get(key)
                return { key, data }
              } else if (indexData.dataType === "hash") {
                const data = await redis.hgetall(key)
                return { key, data }
              } else {
                const data = await redis.get(key)
                return { key, data }
              }
            } catch {
              return null
            }
          })

          const results = await Promise.all(dataPromises)
          samples = results.filter(Boolean)
          setSampleData(samples)
        } catch (error) {
          console.error("Error fetching sample data:", error)
        }
      }

      const result = await generateQuery.mutateAsync({
        prompt: input,
        searchIndex: indexData,
        sampleData: samples,
      })

      const queryString = JSON.stringify(result.query, null, 2)
      setValuesSearchQuery(queryString)

      setQueryBuilderMode("code")

      onClose?.()
    } catch (error: any) {
      console.error("Error generating query:", error)
    }
  }

  const handleKeyPress = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter" && !e.shiftKey) {
      e.preventDefault()
      handleGenerate()
    }
  }

  if (isLoadingIndex) {
    return (
      <div className="flex h-[100px] items-center justify-center">
        <Spinner isLoading={true} isLoadingText="Loading index..." />
      </div>
    )
  }

  if (!valuesSearch.index) {
    return (
      <div className="flex h-[100px] items-center justify-center">
        <p className="text-sm text-zinc-500">Please select an index first</p>
      </div>
    )
  }

  if (aiDataSharingConsent === null) {
    return <AiConsentDialog onClose={onClose} />
  }

  if (aiDataSharingConsent === false) {
    return <AiAccessRequired onClose={onClose} />
  }

  const errorType = generateQuery.error ? getErrorType(generateQuery.error.message) : null
  const errorIcon =
    errorType === "auth"
      ? "🔒"
      : errorType === "ratelimit"
        ? "⏱️"
        : errorType === "generic"
          ? "⚠️"
          : null
  const errorBgColor =
    errorType === "auth"
      ? "bg-amber-50 dark:bg-amber-950"
      : errorType === "ratelimit"
        ? "bg-blue-50 dark:bg-blue-950"
        : "bg-red-50 dark:bg-red-950"
  const errorTextColor =
    errorType === "auth"
      ? "text-amber-700 dark:text-amber-400"
      : errorType === "ratelimit"
        ? "text-blue-700 dark:text-blue-400"
        : "text-red-700 dark:text-red-400"

  return (
    <div className="flex flex-col gap-3">
      <div>
        <Label htmlFor="query-input" className="mb-1.5 block text-sm font-medium">
          What would you like to find?
        </Label>
        <input
          id="query-input"
          type="text"
          value={input}
          onChange={(e: React.ChangeEvent<HTMLInputElement>) => setInput(e.target.value)}
          onKeyPress={handleKeyPress}
          placeholder="e.g., Find all users younger than 20"
          className="w-full rounded-md border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-emerald-500 focus:outline-none focus:ring-1 focus:ring-emerald-500 disabled:cursor-not-allowed disabled:opacity-50"
          disabled={generateQuery.isPending}
          autoFocus
        />
        <p className="mt-1 text-xs text-zinc-500">
          Index: <strong>{valuesSearch.index}</strong>
        </p>
      </div>

      {generateQuery.error && (
        <div
          className={`flex items-start gap-2 rounded-md p-3 text-sm ${errorBgColor} ${errorTextColor}`}
        >
          {errorIcon && <span className="text-base leading-none">{errorIcon}</span>}
          <div className="flex-1">
            <p className="font-medium">
              {errorType === "auth"
                ? "Authentication Required"
                : errorType === "ratelimit"
                  ? "Rate Limit Reached"
                  : "Generation Failed"}
            </p>
            <p className="mt-0.5 text-xs opacity-90">{generateQuery.error.message}</p>
            {errorType === "ratelimit" && (
              <p className="mt-1.5 text-xs opacity-75">
                The server is busy right now. Please wait a moment and try again.
              </p>
            )}
          </div>
        </div>
      )}

      <div className="flex justify-end gap-2">
        <Button onClick={onClose} disabled={generateQuery.isPending} size="sm">
          Cancel
        </Button>
        <Button
          onClick={handleGenerate}
          disabled={!input.trim() || generateQuery.isPending}
          variant="primary"
          size="sm"
        >
          <Spinner isLoading={generateQuery.isPending} isLoadingText="Generating...">
            Generate
          </Spinner>
        </Button>
      </div>
    </div>
  )
}
