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
}: {
  children?: React.ReactNode
  onDeleteConfirm: MouseEventHandler
  open?: boolean
  onOpenChange?: (open: boolean) => void
  deletionType: "item" | "key"
}) {
  return (
    <AlertDialog open={open} onOpenChange={onOpenChange}>
      {children && <AlertDialogTrigger asChild>{children}</AlertDialogTrigger>}

      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>
            {deletionType === "item" ? "Delete Item" : "Delete Key"}
          </AlertDialogTitle>
          <AlertDialogDescription className="mt-5">
            Are you sure you want to delete this {deletionType}? This action cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <AlertDialogFooter>
          <AlertDialogCancel type="button">Cancel</AlertDialogCancel>
          <AlertDialogAction
            className="bg-red-500 text-gray-50 hover:bg-red-600"
            onClick={onDeleteConfirm}
          >
            Yes, Delete
          </AlertDialogAction>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  )
}
