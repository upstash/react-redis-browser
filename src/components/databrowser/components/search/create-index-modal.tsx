import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"

import { SearchDisplay } from "../display/display-search"

export const CreateIndexModal = ({
  open,
  onOpenChange,
}: {
  open: boolean
  onOpenChange: (open: boolean) => void
}) => {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl">
        <DialogHeader>
          <DialogTitle>Create new Index</DialogTitle>
        </DialogHeader>
        <div className="sr-only">
          <DialogDescription>Create new search index</DialogDescription>
        </div>

        <SearchDisplay isCreateModal onClose={() => onOpenChange(false)} />
      </DialogContent>
    </Dialog>
  )
}
