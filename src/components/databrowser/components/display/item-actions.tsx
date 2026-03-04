import { useTab } from "@/tab-provider"
import type { ListDataType } from "@/types"
import { IconDotsVertical } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useEditListItem } from "../../hooks/use-edit-list-item"
import { DeleteKeyModal } from "../delete-key-modal"

export function ItemActions({ dataKey, type }: { dataKey: string; type: ListDataType }) {
  const { selectedListItem, setSelectedListItem } = useTab()
  const { mutateAsync: editItem } = useEditListItem()

  if (!selectedListItem) return

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" aria-label="Item actions">
          <IconDotsVertical
            className="size-4 text-zinc-500 dark:text-zinc-600"
            fill="rgb(var(--color-zinc-500))"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent align="end">
        <DeleteKeyModal
          deletionType="item"
          name={selectedListItem.key}
          nameLabel={type === "list" ? "item at index" : undefined}
          onDeleteConfirm={async () => {
            await editItem({
              type,
              dataKey,
              itemKey: selectedListItem.key,
              newKey: undefined,
            })
            setSelectedListItem(undefined)
          }}
        >
          <DropdownMenuItem
            className="text-red-500 focus:bg-red-500 focus:text-white"
            onSelect={(e) => e.preventDefault()}
          >
            Delete item
          </DropdownMenuItem>
        </DeleteKeyModal>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
