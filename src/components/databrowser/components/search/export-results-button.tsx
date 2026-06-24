import { useRef, useState } from "react"
import { useRedis } from "@/redis-context"
import { useTab } from "@/tab-provider"
import { IconDownload } from "@tabler/icons-react"
import bytesLib from "bytes"

import type { ExportFormat } from "@/lib/export-search-results"
import {
  buildExportFilename,
  downloadTextFile,
  estimateExport,
  estimateExportBytes,
  exportSearchResults,
} from "@/lib/export-search-results"
import { parseJSObjectLiteral } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Spinner } from "@/components/ui/spinner"
import { SimpleTooltip } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { useFetchSearchIndex } from "@/components/databrowser/hooks/use-fetch-search-index"

type Status = "estimating" | "idle" | "exporting" | "done" | "error"

type SampleDoc = { key: string; score: number; data: unknown }

const formatResults = (n: number) => `${n.toLocaleString()} ${n === 1 ? "result" : "results"}`

export const ExportResultsButton = () => {
  const { valuesSearch } = useTab()
  const indexName = valuesSearch.index
  const { redis, redisNoPipeline } = useRedis()
  const { data: indexDetails } = useFetchSearchIndex(indexName)
  const dataType = (indexDetails?.dataType ?? "string") as "string" | "hash" | "json"

  const [open, setOpen] = useState(false)
  const [format, setFormat] = useState<ExportFormat>("json")
  const [status, setStatus] = useState<Status>("idle")
  const [progress, setProgress] = useState<{ count: number; bytes: number }>({ count: 0, bytes: 0 })
  const [estimate, setEstimate] = useState<{ count: number; sampleDocs: SampleDoc[] }>()
  const [errorMsg, setErrorMsg] = useState<string>()

  const exportControllerRef = useRef<AbortController | undefined>()
  const estimateControllerRef = useRef<AbortController | undefined>()

  const isExporting = status === "exporting"
  const estimatedBytes = estimate
    ? estimateExportBytes(estimate.count, estimate.sampleDocs, format)
    : undefined

  const getFilter = () => parseJSObjectLiteral<Record<string, unknown>>(valuesSearch.query) ?? {}

  const runEstimate = async () => {
    if (!indexName || !indexDetails) return

    estimateControllerRef.current?.abort()
    const controller = new AbortController()
    estimateControllerRef.current = controller

    setStatus("estimating")
    try {
      const result = await estimateExport({
        searchRedis: redisNoPipeline,
        readRedis: redis,
        indexName,
        filter: getFilter(),
        dataType,
        signal: controller.signal,
      })
      if (controller.signal.aborted) return
      setEstimate(result)
      setStatus("idle")
    } catch {
      // Estimation is best-effort; allow exporting without it.
      if (!controller.signal.aborted) setStatus("idle")
    }
  }

  const handleOpenChange = (next: boolean) => {
    if (isExporting) return // don't allow closing mid-export
    if (next) {
      // Reset any leftover state from a previous run, then estimate.
      setStatus("idle")
      setProgress({ count: 0, bytes: 0 })
      setErrorMsg(undefined)
      setEstimate(undefined)
      setOpen(true)
      void runEstimate()
    } else {
      estimateControllerRef.current?.abort()
      setOpen(false)
    }
  }

  const handleExport = async () => {
    if (!indexName) return

    // A still-running estimate would otherwise resolve and stomp the exporting state.
    estimateControllerRef.current?.abort()

    setStatus("exporting")
    setErrorMsg(undefined)
    setProgress({ count: 0, bytes: 0 })

    const controller = new AbortController()
    exportControllerRef.current = controller

    try {
      const { content, count, bytes } = await exportSearchResults({
        searchRedis: redisNoPipeline,
        readRedis: redis,
        indexName,
        filter: getFilter(),
        dataType,
        format,
        signal: controller.signal,
        onProgress: (p) => setProgress(p),
      })

      downloadTextFile(
        content,
        buildExportFilename(indexName, format),
        format === "csv" ? "text/csv;charset=utf-8" : "application/json"
      )

      setProgress({ count, bytes })
      setStatus("done")
      toast({ description: `Exported ${formatResults(count)}` })
    } catch (error) {
      if (error instanceof Error && error.name === "AbortError") {
        setStatus("idle")
        return
      }
      setStatus("error")
      setErrorMsg(error instanceof Error ? error.message : String(error))
    }
  }

  return (
    <>
      <SimpleTooltip content="Export results">
        <Button
          size="icon"
          aria-label="Export results"
          disabled={!indexName}
          onClick={() => handleOpenChange(true)}
        >
          <IconDownload className="size-5 text-zinc-500" />
        </Button>
      </SimpleTooltip>

      <Dialog open={open} onOpenChange={handleOpenChange}>
        <DialogContent
          onEscapeKeyDown={(e) => {
            if (isExporting) e.preventDefault()
          }}
          onInteractOutside={(e) => {
            if (isExporting) e.preventDefault()
          }}
        >
          <DialogHeader>
            <DialogTitle>Export results</DialogTitle>
            <DialogDescription>
              Exports every result matching the current query from{" "}
              <span className="font-medium text-zinc-900 dark:text-zinc-100">{indexName}</span>,
              including each document&apos;s key, score, and values.
            </DialogDescription>
          </DialogHeader>

          <div className="flex flex-col gap-4">
            <div className="flex flex-col gap-1.5">
              <span className="text-xs font-medium text-zinc-500">Format</span>
              <div className="flex w-fit rounded-md border border-zinc-300 p-0.5">
                {(["json", "csv"] as const).map((f) => (
                  <button
                    key={f}
                    type="button"
                    disabled={isExporting}
                    onClick={() => setFormat(f)}
                    className={
                      "rounded px-3 py-1 text-sm font-medium transition-colors disabled:opacity-50 " +
                      (format === f
                        ? "bg-zinc-900 text-zinc-50 dark:bg-zinc-100 dark:text-zinc-900"
                        : "text-zinc-600 hover:bg-zinc-100")
                    }
                  >
                    {f.toUpperCase()}
                  </button>
                ))}
              </div>
            </div>

            {status === "estimating" && (
              <div className="flex items-center gap-2 text-sm text-zinc-500">
                <Spinner isLoading={true} isLoadingText="" />
                <span>Estimating size…</span>
              </div>
            )}

            {status === "idle" && estimate && estimate.count > 0 && (
              <div className="text-sm text-zinc-600">
                Estimated output: ~{formatResults(estimate.count)}
                {estimatedBytes ? ` · ~${bytesLib(estimatedBytes)}` : ""}
              </div>
            )}

            {status === "idle" && estimate?.count === 0 && (
              <div className="text-sm text-zinc-500">This index has no results to export.</div>
            )}

            {(isExporting || status === "done") && (
              <div className="flex items-center gap-2 text-sm text-zinc-600">
                {isExporting && <Spinner isLoading={true} isLoadingText="" />}
                <span>
                  {formatResults(progress.count)} {isExporting ? "exported so far" : "exported"}
                  {progress.bytes > 0 && ` · ${bytesLib(progress.bytes)}`}
                </span>
              </div>
            )}

            {status === "error" && errorMsg && (
              <div className="w-full break-words text-sm text-red-500">{errorMsg}</div>
            )}
          </div>

          <DialogFooter>
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                if (isExporting) {
                  exportControllerRef.current?.abort()
                } else {
                  handleOpenChange(false)
                }
              }}
            >
              {isExporting ? "Cancel" : "Close"}
            </Button>
            <Button
              variant="primary"
              disabled={
                isExporting ||
                status === "estimating" ||
                !indexName ||
                !indexDetails ||
                estimate?.count === 0
              }
              onClick={handleExport}
            >
              <Spinner isLoading={isExporting} isLoadingText="Exporting">
                Export
              </Spinner>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
