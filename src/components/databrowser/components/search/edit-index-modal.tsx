import { useEffect } from "react"

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { SearchDisplay } from "./display-search"

export const EditIndexModal = ({
  open,
  onOpenChange,
  indexName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  indexName?: string
}) => {
  const { data: indexData, isLoading: isIndexLoading } = useFetchSearchIndex(indexName, {
    enabled: open,
  })

  // Close modal if index is deleted
  useEffect(() => {
    if (open && !isIndexLoading && indexData === null) {
      onOpenChange(false)
    }
  }, [indexData, onOpenChange, isIndexLoading, open])

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent
        className="min-h-[500px] max-w-2xl"
        onEscapeKeyDown={(e) => {
          // Prevent ESC from closing modal when focused inside the editor
          const active = document.activeElement
          if (active?.closest(".monaco-editor") || active?.tagName === "TEXTAREA") {
            e.preventDefault()
          }
        }}
      >
        <DialogHeader>
          <DialogTitle>Edit Index</DialogTitle>
        </DialogHeader>
        <div className="sr-only">
          <DialogDescription>Edit search index schema</DialogDescription>
        </div>
        {indexName && (
          <SearchDisplay indexName={indexName} isEditModal onClose={() => onOpenChange(false)} />
        )}
      </DialogContent>
    </Dialog>
  )
}
