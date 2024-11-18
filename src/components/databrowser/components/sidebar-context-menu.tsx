import { useState, type PropsWithChildren } from "react"
import { ContextMenuSeparator } from "@radix-ui/react-context-menu"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "@/components/ui/use-toast"

import { useDeleteKey } from "../hooks"
import { DeleteAlertDialog } from "./display/delete-alert-dialog"

export const SidebarContextMenu = ({ children }: PropsWithChildren) => {
  const { mutate: deleteKey } = useDeleteKey()
  const [isAlertOpen, setAlertOpen] = useState(false)
  const [dataKey, setDataKey] = useState("")

  return (
    <>
      <DeleteAlertDialog
        deletionType="key"
        open={isAlertOpen}
        onOpenChange={setAlertOpen}
        onDeleteConfirm={(e) => {
          e.stopPropagation()
          deleteKey(dataKey)
          setAlertOpen(false)
        }}
      />
      <ContextMenu>
        <ContextMenuTrigger
          // NOTE: We did not put the ContextMenu on every key because of performance reasons
          onContextMenu={(e) => {
            const el = e.target as HTMLElement
            const key = el.closest("[data-key]")

            if (key && key instanceof HTMLElement && key.dataset.key !== undefined) {
              setDataKey(key.dataset.key)
            } else {
              throw new Error("Key not found")
            }
          }}
        >
          {children}
        </ContextMenuTrigger>
        <ContextMenuContent>
          <ContextMenuItem
            onClick={() => {
              navigator.clipboard.writeText(dataKey)
              toast({
                description: "Key copied to clipboard",
              })
            }}
          >
            Copy key
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setAlertOpen(true)}>Delete key</ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  )
}
