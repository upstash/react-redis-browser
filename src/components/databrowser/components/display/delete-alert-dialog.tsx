import type { MouseEventHandler } from "react"

import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog"

export function DeleteAlertDialog({
  children,
  onDeleteConfirm,
  open,
  onOpenChange,
  deletionType,
  count = 1,
}: {
  children?: React.ReactNode
  onDeleteConfirm: MouseEventHandler
  open?: boolean
  onOpenChange?: (open: boolean) => void
  deletionType: "item" | "key"
  count?: number
}) {
  const isPlural = count > 1
  const itemLabel = deletionType === "item" ? "Item" : "Key"
  const itemsLabel = deletionType === "item" ? "Items" : "Keys"

  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {isPlural ? `Delete ${count} ${itemsLabel}` : `Delete ${itemLabel}`}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-5">
            Are you sure you want to delete {isPlural ? `these ${count} ${deletionType}s` : `this ${deletionType}`}?<br />
            This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 text-zinc-50 hover:bg-red-600"
            onClick={onDeleteConfirm}
          >
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
