import { useEffect, useState } from "react"
import { useRedis } from "@/redis-context"

import { queryClient } from "@/lib/clients"
import { formatUpstashErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Progress } from "@/components/ui/progress"

import { FETCH_SEARCH_INDEX_QUERY_KEY } from "../../hooks/use-fetch-search-index"
import { FETCH_SEARCH_INDEXES_QUERY_KEY } from "../../hooks/use-fetch-search-indexes"
import { parseSchemaFromEditorValue } from "./schema-parser"

type FormValues = {
  indexName: string
  editorValue: string
  dataType: string
  prefixes: string
  language: string
}

export const SaveSchemaModal = ({
  values,
  onClose,
}: {
  values: FormValues | undefined
  onClose: () => void
}) => {
  const { redisNoPipeline: redis } = useRedis()
  const [status, setStatus] = useState<string | undefined>()
  const [progress, setProgress] = useState(0)
  const [error, setError] = useState<Error | undefined>()

  // Reset state only when modal opens (not on close, to avoid flashing idle state)
  useEffect(() => {
    if (!values) return
    setProgress(0)
    setStatus(undefined)
    setError(undefined)
  }, [values])

  const handleConfirm = async () => {
    if (!values) return

    try {
      const result = parseSchemaFromEditorValue(values.editorValue)
      if (!result.success) throw new Error(result.error)

      // Drop and recreate index in a transaction
      setStatus("Saving index...")
      setProgress(33)

      // const tx = redis.multi()
      await redis.search.index({ name: values.indexName }).drop()

      try {
        await redis.search.createIndex({
          name: values.indexName,
          dataType: values.dataType as any,
          prefix: values.prefixes
            .split(",")
            .map((p) => p.trim())
            .filter(Boolean),
          language: values.language as any,
          schema: result.schema as any,
        })
      } catch (txError) {
        const err = txError instanceof Error ? txError : new Error(String(txError))
        throw new Error(
          `Your index was deleted, but there was an error when trying to re-create it: ${formatUpstashErrorMessage(err)}`
        )
      }

      // Wait for indexing
      setStatus("Waiting for indexing...")
      setProgress(66)
      await redis.search.index({ name: values.indexName }).waitIndexing()

      // Done
      setStatus("Done")
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 500))

      // Invalidate queries
      queryClient.invalidateQueries({
        queryKey: [FETCH_SEARCH_INDEX_QUERY_KEY, values.indexName],
      })
      queryClient.invalidateQueries({
        queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
      })

      onClose()
    } catch (catchedError) {
      setError(catchedError instanceof Error ? catchedError : new Error(String(catchedError)))
      setStatus(undefined)
    }
  }

  const isRunning = status !== undefined

  return (
    <Dialog
      open={values !== undefined}
      onOpenChange={(open) => {
        if (!open && !isRunning) onClose()
      }}
    >
      <DialogContent
        onInteractOutside={(e) => {
          if (isRunning) e.preventDefault()
        }}
        onEscapeKeyDown={(e) => {
          if (isRunning) e.preventDefault()
        }}
      >
        <DialogHeader>
          <DialogTitle>Save Schema Changes</DialogTitle>
          {!isRunning && !error && (
            <DialogDescription>
              Saving will drop and recreate the index. This will temporarily make the index
              unavailable.
              <br />
              <br />
              Are you sure you want to continue?
            </DialogDescription>
          )}
        </DialogHeader>

        {isRunning && (
          <div className="flex flex-col gap-2 py-4">
            <p className="text-sm text-zinc-500">{status}</p>
            <Progress value={progress} />
          </div>
        )}

        {error && (
          <div className="w-full break-words text-sm text-red-500">
            {formatUpstashErrorMessage(error)}
          </div>
        )}

        <DialogFooter>
          {!isRunning && !error && (
            <>
              <Button onClick={onClose}>Cancel</Button>
              <Button variant="primary" onClick={handleConfirm}>
                Confirm
              </Button>
            </>
          )}
          {error && <Button onClick={onClose}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
