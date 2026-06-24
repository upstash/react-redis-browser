import { useState } from "react"
import { useTab } from "@/tab-provider"
import { IconCopy, IconDotsVertical, IconEdit, IconTrash } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { Spinner } from "@/components/ui/spinner"
import { toast } from "@/components/ui/use-toast"

import { useDropSearchIndex } from "../../hooks/use-drop-search-index"
import { EditIndexModal } from "./edit-index-modal"

export const IndexActionsMenu = () => {
  const { valuesSearch, setValuesSearchIndex } = useTab()
  const indexName = valuesSearch.index

  const [editOpen, setEditOpen] = useState(false)
  const [deleteOpen, setDeleteOpen] = useState(false)

  const dropIndex = useDropSearchIndex()

  return (
    <>
      <DropdownMenu modal={false}>
        <DropdownMenuTrigger asChild>
          <Button size="icon" aria-label="Index actions" disabled={!indexName}>
            <IconDotsVertical className="size-4 text-zinc-500" />
          </Button>
        </DropdownMenuTrigger>
        <DropdownMenuContent align="end">
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(indexName)
              toast({ description: "Index key copied to clipboard" })
            }}
          >
            <IconCopy className="size-5" />
            Copy Key
          </DropdownMenuItem>
          <DropdownMenuItem onClick={() => setEditOpen(true)}>
            <IconEdit className="size-5" />
            Edit Index...
          </DropdownMenuItem>
          <DropdownMenuSeparator />
          <DropdownMenuItem
            className="text-red-500 focus:bg-red-500 focus:text-white"
            onSelect={(e) => e.preventDefault()}
            onClick={() => setDeleteOpen(true)}
          >
            <IconTrash className="size-5" />
            Delete Index...
          </DropdownMenuItem>
        </DropdownMenuContent>
      </DropdownMenu>

      <EditIndexModal open={editOpen} onOpenChange={setEditOpen} indexName={indexName} />

      <Dialog open={deleteOpen} onOpenChange={setDeleteOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Delete Index</DialogTitle>
            <DialogDescription className="mt-5">
              Are you sure you want to delete index{" "}
              <span className="break-all font-medium text-zinc-900">"{indexName}"</span>? Deleting
              the index does not delete the underlying keys. This action cannot be undone.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter>
            <Button
              variant="outline"
              disabled={dropIndex.isPending}
              onClick={() => setDeleteOpen(false)}
            >
              Cancel
            </Button>
            <Button
              variant="primary"
              className="bg-red-500 text-zinc-50 hover:bg-red-600"
              disabled={dropIndex.isPending}
              onClick={async () => {
                try {
                  await dropIndex.mutateAsync(indexName)
                  setValuesSearchIndex("")
                  setDeleteOpen(false)
                  toast({ description: "Index deleted" })
                } catch (error) {
                  toast({
                    variant: "destructive",
                    description: error instanceof Error ? error.message : "Failed to delete index",
                  })
                }
              }}
            >
              <Spinner isLoading={dropIndex.isPending} isLoadingText="Deleting">
                Yes, Delete
              </Spinner>
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </>
  )
}
