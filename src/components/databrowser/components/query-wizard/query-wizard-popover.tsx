import { useState } from "react"
import { useRedis } from "@/redis-context"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { IconChevronRight } from "@tabler/icons-react"
import { useMutation } from "@tanstack/react-query"

import { scanKeys } from "@/lib/scan-keys"
import { toJsLiteral } from "@/lib/utils"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"

import type { SearchIndex } from "../../hooks/use-fetch-search-index"
import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { DocsLink } from "../docs-link"
import { ConsentPrompt } from "./consent-prompt"
import { useGenerateQuery } from "./use-query-wizard"

export const QueryWizardPopover = ({ onClose }: { onClose?: () => void }) => {
  const { valuesSearch, setValuesSearchQuery, setQueryBuilderMode } = useTab()
  const { redisNoPipeline: redis } = useRedis()
  const [input, setInput] = useState("")
  const [sampleData, setSampleData] = useState<any[]>([])
  const [showIndexFields, setShowIndexFields] = useState(false)

  const { aiDataSharingConsent } = useDatabrowserStore()

  const { data: indexData, isLoading: isLoadingIndex } = useFetchSearchIndex(valuesSearch.index)
  const generateQuery = useGenerateQuery()

  const fetchSampleKeys = useMutation({
    mutationFn: async (index: SearchIndex) => {
      const firstTenKeys = await scanKeys(redis, {
        match: `${index.prefixes?.[0]}*`,
        type: index.dataType,
        limit: 10,
      })

      const dataPromises = firstTenKeys.map(async (key) => {
        try {
          if (index.dataType === "json") {
            const data = await redis.json.get(key)
            return { key, data }
          } else if (index.dataType === "hash") {
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
      const filtered = results.filter(Boolean)
      setSampleData(filtered)
      return filtered
    },
  })

  const handleGenerate = async () => {
    if (!input.trim() || !valuesSearch.index) return

    try {
      let samples = sampleData
      if (samples.length === 0 && indexData?.prefixes?.[0]) {
        samples = await fetchSampleKeys.mutateAsync(indexData)
      }

      const result = await generateQuery.mutateAsync({
        prompt: input,
        searchIndex: indexData ?? undefined,
        sampleData: samples,
      })

      const queryString = toJsLiteral(result.query)
      setValuesSearchQuery(queryString)

      setQueryBuilderMode("code")

      onClose?.()
    } catch (error: any) {
      console.error("Error generating query:", error)
    }
  }

  if (isLoadingIndex) {
    return (
      <div className="flex h-[100px] w-[340px] items-center justify-center rounded-2xl bg-white">
        <Spinner isLoading={true} isLoadingText="Loading index..." />
      </div>
    )
  }

  if (!valuesSearch.index) {
    return (
      <div className="flex w-[340px] flex-col items-center gap-2 rounded-2xl bg-white p-8">
        <p className="text-sm font-medium text-zinc-700">No index selected</p>
        <p className="text-center text-xs text-zinc-500">
          Create a new index to use the Query Wizard.
        </p>
      </div>
    )
  }

  if (aiDataSharingConsent === false) {
    return <ConsentPrompt onClose={onClose} />
  }

  return (
    <div className="flex w-[500px] flex-col gap-6 rounded-2xl bg-white p-6">
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-zinc-950">AI Query Builder</h3>
        <div className="flex items-center justify-center rounded-md bg-purple-100 px-1.5 py-0.5">
          <span className="!text-sm font-medium text-purple-700">BETA</span>
        </div>
      </div>

      {generateQuery.error && (
        <div className="mt-2 rounded-md border border-yellow-300 bg-yellow-50 p-4">
          <p className="!text-sm font-medium !text-yellow-800">{generateQuery.error.name}</p>
          <p className="mt-0.5 !text-sm !text-yellow-800 opacity-90">
            {generateQuery.error.message}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-5">
        <button
          onClick={() => setShowIndexFields(!showIndexFields)}
          className="flex h-8 items-center gap-1.5 rounded-md border border-zinc-300 bg-zinc-50 px-3 hover:bg-zinc-100"
        >
          <IconChevronRight
            className={`size-5 text-zinc-700 transition-transform ${showIndexFields ? "rotate-90" : ""}`}
          />
          <span className="text-sm font-medium text-zinc-700">Show Index fields</span>
        </button>

        {showIndexFields && indexData && (
          <div className="rounded-md border border-zinc-200 bg-zinc-50 p-3">
            <pre className="max-h-40 overflow-auto text-xs text-zinc-700">
              {JSON.stringify(indexData.schema, null, 2)}
            </pre>
          </div>
        )}

        <div className="flex flex-col gap-1">
          <Label htmlFor="query-input" className="text-sm font-medium text-zinc-950">
            Describe
          </Label>
          <textarea
            id="query-input"
            value={input}
            onChange={(e: React.ChangeEvent<HTMLTextAreaElement>) => setInput(e.target.value)}
            placeholder=""
            className="h-[58px] w-full resize-none rounded-md border border-zinc-300 bg-white px-3 py-3 text-sm text-zinc-950 shadow-sm focus:border-purple-500 focus:outline-none focus:ring-1 focus:ring-purple-500 disabled:cursor-not-allowed disabled:opacity-50"
            disabled={generateQuery.isPending || fetchSampleKeys.isPending}
            autoFocus
          />
          <div>
            <span className="text-xs text-zinc-500">
              Example: Find people named "John", boost if older than 20.
            </span>
            <DocsLink href="https://upstash.com/docs/redis/search/query-operators/boolean-operators/overview" />
          </div>
        </div>
      </div>

      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          disabled={generateQuery.isPending || fetchSampleKeys.isPending}
          className="flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm text-zinc-950 shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-zinc-50 disabled:cursor-not-allowed disabled:opacity-50"
        >
          Cancel
        </button>
        <button
          onClick={handleGenerate}
          disabled={!input.trim() || generateQuery.isPending || fetchSampleKeys.isPending}
          className="flex h-8 items-center justify-center gap-2 rounded-md bg-purple-500 px-4 text-sm text-white shadow-[0_1px_1px_rgba(0,0,0,0.05)] hover:bg-purple-600 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:bg-purple-500"
        >
          {fetchSampleKeys.isPending ? (
            <>
              <Spinner isLoading={true} />
              Sampling keys...
            </>
          ) : generateQuery.isPending ? (
            <>
              <Spinner isLoading={true} />
              Generating...
            </>
          ) : (
            "Generate Query"
          )}
        </button>
      </div>
    </div>
  )
}
