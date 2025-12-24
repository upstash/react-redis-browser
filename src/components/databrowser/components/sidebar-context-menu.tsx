import { useState, type PropsWithChildren } from "react"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { ContextMenuSeparator } from "@radix-ui/react-context-menu"
import { IconCopy, IconExternalLink, IconTrash } from "@tabler/icons-react"

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
  const [contextKeys, setContextKeys] = useState<string[]>([])
  const {
    addTab,
    setSelectedKey: setSelectedKeyGlobal,
    selectTab,
    setSearch,
  } = useDatabrowserStore()
  const { search: currentSearch, selectedKeys, setSelectedKey } = useTab()

  return (
    <>
      <DeleteAlertDialog
        deletionType="key"
        count={contextKeys.length}
        open={isAlertOpen}
        onOpenChange={setAlertOpen}
        onDeleteConfirm={(e) => {
          e.stopPropagation()
          // Delete all selected keys
          for (const key of contextKeys) {
            deleteKey(key)
          }
          setAlertOpen(false)
        }}
      />
      <ContextMenu modal={false}>
        <ContextMenuTrigger
          // NOTE: We did not put the ContextMenu on every key because of performance reasons
          onContextMenu={(e) => {
            const el = e.target as HTMLElement
            const key = el.closest("[data-key]")

            if (key && key instanceof HTMLElement && key.dataset.key !== undefined) {
              const clickedKey = key.dataset.key

              // If right-clicking on a selected key, keep all selected keys
              if (selectedKeys.includes(clickedKey)) {
                setContextKeys(selectedKeys)
              } else {
                // If right-clicking on an unselected key, select only that key
                setSelectedKey(clickedKey)
                setContextKeys([clickedKey])
              }
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
              navigator.clipboard.writeText(contextKeys[0])
              toast({
                description: "Key copied to clipboard",
              })
            }}
            className="gap-2"
            disabled={contextKeys.length !== 1}
          >
            <IconCopy size={16} />
            Copy key
          </ContextMenuItem>
          <ContextMenuItem
            onClick={() => {
              const newTabId = addTab()
              setSelectedKeyGlobal(newTabId, contextKeys[0])
              setSearch(newTabId, currentSearch)
              selectTab(newTabId)
            }}
            className="gap-2"
            disabled={contextKeys.length !== 1}
          >
            <IconExternalLink size={16} />
            Open in new tab
          </ContextMenuItem>
          <ContextMenuSeparator />
          <ContextMenuItem onClick={() => setAlertOpen(true)} className="gap-2">
            <IconTrash size={16} />
            {contextKeys.length > 1 ? `Delete ${contextKeys.length} keys` : "Delete key"}
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>
    </>
  )
}
