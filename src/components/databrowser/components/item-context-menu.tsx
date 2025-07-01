import { useState, type PropsWithChildren } from "react"
import { type ListDataType } from "@/types"
import { ContextMenuSeparator } from "@radix-ui/react-context-menu"

import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { toast } from "@/components/ui/use-toast"

import { useEditListItem } from "../hooks"
import { DeleteAlertDialog } from "./display/delete-alert-dialog"
import type { ItemData } from "./display/display-list"

export const ItemContextMenu = ({
  children,
  dataKey,
  type,
}: PropsWithChildren<{
  dataKey: string
  type: ListDataType
}>) => {
  const { mutate: editItem } = useEditListItem()
  const [isAlertOpen, setAlertOpen] = useState(false)
  const [data, setData] = useState<ItemData | undefined>()

  return (
    <>
      <DeleteAlertDialog
        deletionType="item"
        open={isAlertOpen}
        onOpenChange={setAlertOpen}
        onDeleteConfirm={(e) => {
          e.stopPropagation()
          if (data) {
            editItem({
              type,
              dataKey,
              itemKey: data?.key,
              // For deletion
              newKey: undefined,
            })
          }
          setAlertOpen(false)
        }}
      />
      <ContextMenu modal={false}>
        <ContextMenuTrigger
          asChild
          // NOTE: We did not put the ContextMenu on every key because of performance reasons
          onContextMenu={(e) => {
            const el = e.target as HTMLElement
            const item = el.closest("[data-item-key]")

            if (item && item instanceof HTMLElement && item.dataset.itemKey !== undefined) {
              setData({
                key: item.dataset.itemKey,
                value: item.dataset.itemValue,
              })
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
              if (!data) return
              navigator.clipboard.writeText(data?.key)
              toast({
                description: "Key copied to clipboard",
              })
            }}
          >
            Copy key
          </ContextMenuItem>
          {data?.value && (
            <ContextMenuItem
              onClick={() => {
                navigator.clipboard.writeText(data?.value ?? "")
                toast({
                  description: "Value copied to clipboard",
                })
              }}
            >
              Copy value
            </ContextMenuItem>
          )}
          <ContextMenuSeparator />
          <ContextMenuItem disabled={type === "stream"} onClick={() => setAlertOpen(true)}>
            Delete item
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  )
}
