import { useState, type MouseEvent } from "react"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { Switch } from "@/components/ui/switch"

export function DeleteKeyModal({
  children,
  onDeleteConfirm,
  open,
  onOpenChange,
  deletionType,
  count = 1,
  showReindex,
}: {
  children?: React.ReactNode
  onDeleteConfirm: (e: MouseEvent, options?: { reindex?: boolean }) => void | Promise<void>
  open?: boolean
  onOpenChange?: (open: boolean) => void
  deletionType: "item" | "key"
  count?: number
  showReindex?: boolean
}) {
  const isPlural = count > 1
  const itemLabel = deletionType === "item" ? "Item" : "Key"
  const itemsLabel = deletionType === "item" ? "Items" : "Keys"
  const [reindex, setReindex] = useState(true)
  const [isPending, setIsPending] = useState(false)

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      {children && <DialogTrigger asChild>{children}</DialogTrigger>}

      <DialogContent>
        <DialogHeader>
          <DialogTitle>
            {isPlural ? `Delete ${count} ${itemsLabel}` : `Delete ${itemLabel}`}
          </DialogTitle>
          <DialogDescription className="mt-5">
            Are you sure you want to delete{" "}
            {isPlural ? `these ${count} ${deletionType}s` : `this ${deletionType}`}?<br />
            This action cannot be undone.
          </DialogDescription>
        </DialogHeader>

        {showReindex && (
          <div className="flex items-center gap-2">
            <Switch
              id="reindex"
              checked={reindex}
              onCheckedChange={setReindex}
              disabled={isPending}
            />
            <Label htmlFor="reindex" className="cursor-pointer text-sm text-zinc-700">
              Reindex after deletion
            </Label>
          </div>
        )}

        <DialogFooter>
          <Button
            type="button"
            variant="outline"
            disabled={isPending}
            onClick={() => onOpenChange?.(false)}
          >
            Cancel
          </Button>
          <Button
            variant="primary"
            className="bg-red-500 text-zinc-50 hover:bg-red-600"
            disabled={isPending}
            onClick={async (e) => {
              setIsPending(true)
              try {
                await onDeleteConfirm(e, { reindex })
              } finally {
                setIsPending(false)
              }
            }}
          >
            <Spinner isLoading={isPending} isLoadingText="Deleting">
              Yes, Delete
            </Spinner>
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
