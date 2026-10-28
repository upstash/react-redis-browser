import { useEffect, useRef, useState } from "react"
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
import { toast } from "@/components/ui/use-toast"

import { FETCH_SEARCH_INDEX_QUERY_KEY } from "../../hooks/use-fetch-search-index"
import { FETCH_SEARCH_INDEXES_QUERY_KEY } from "../../hooks/use-fetch-search-indexes"
import { FETCH_KEYS_QUERY_KEY } from "../../hooks/use-keys"
import { replaceIndex } from "./replace-index"
import { parsePrefixes, parseSchemaFromEditorValue, validateIndexDefinition } from "./schema-parser"

const invalidateIndexQueries = (indexName: string) => {
  queryClient.invalidateQueries({
    queryKey: [FETCH_SEARCH_INDEX_QUERY_KEY, indexName],
  })
  queryClient.invalidateQueries({
    queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
  })
  queryClient.invalidateQueries({ queryKey: [FETCH_KEYS_QUERY_KEY] })
}

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

  // A refetch while the index is re-created (e.g. on window focus) can unmount this modal
  const isMounted = useRef(true)
  useEffect(() => {
    isMounted.current = true
    return () => {
      isMounted.current = false
    }
  }, [])

  // Reset state only when modal opens (not on close, to avoid flashing idle state)
  useEffect(() => {
    if (!values) return
    setProgress(0)
    setStatus(undefined)
    setError(undefined)
  }, [values])

  const handleClose = () => {
    // A failed save can leave a temporary index that a refetch listed
    if (error && values) invalidateIndexQueries(values.indexName)
    onClose()
  }

  const handleConfirm = async () => {
    if (!values) return

    try {
      const result = parseSchemaFromEditorValue(values.editorValue)
      if (!result.success) throw new Error(result.error)

      const prefixes = parsePrefixes(values.prefixes)
      const validationError = validateIndexDefinition({ schema: result.schema, prefixes })
      if (validationError) throw new Error(validationError)

      setStatus("Saving index...")
      setProgress(25)

      await replaceIndex(
        redis,
        values.indexName,
        (name) =>
          redis.search.createIndex({
            name,
            dataType: values.dataType as any,
            prefix: prefixes,
            language: values.language as any,
            schema: result.schema as any,
          }),
        (step) => {
          setStatus(step)
          setProgress((progress) => progress + 25)
        }
      )

      // Done
      setStatus("Done")
      setProgress(100)
      await new Promise((resolve) => setTimeout(resolve, 500))

      invalidateIndexQueries(values.indexName)

      onClose()
    } catch (catchedError) {
      const error = catchedError instanceof Error ? catchedError : new Error(String(catchedError))
      if (!isMounted.current) {
        // Nothing shows the error anymore, so refetch now and show it in a toast
        invalidateIndexQueries(values.indexName)
        toast({
          variant: "destructive",
          title: "Saving the schema failed",
          description: error.message,
        })
        // Tells the parent the save is over
        onClose()
        return
      }
      setError(error)
      setStatus(undefined)
    }
  }

  const isRunning = status !== undefined

  return (
    <Dialog
      open={values !== undefined}
      onOpenChange={(open) => {
        if (!open && !isRunning) handleClose()
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
              Saving will rebuild the index with the new schema. Queries keep working while it
              rebuilds.
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
          {error && <Button onClick={handleClose}>Close</Button>}
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
