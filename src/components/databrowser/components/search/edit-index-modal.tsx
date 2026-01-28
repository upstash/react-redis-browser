import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { SearchDisplay } from "./display-search"

export const EditIndexModal = ({
  open,
  onOpenChange,
  indexName,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
  indexName: string | null
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
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
