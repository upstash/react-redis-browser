import { useTab } from "@/tab-provider"
import { IconDotsVertical } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import { toast } from "@/components/ui/use-toast"

import { useDeleteKey } from "../../hooks"
import { DeleteKeyModal } from "../delete-key-modal"

export function KeyActions({
  dataKey,
  content,
  type,
}: {
  dataKey: string
  content?: string
  type: string
}) {
  const { mutateAsync: deleteKey } = useDeleteKey()
  const { isValuesSearchSelected } = useTab()

  return (
    <DropdownMenu modal={false}>
      <DropdownMenuTrigger asChild>
        <Button size="icon-sm" aria-label="Key actions">
          <IconDotsVertical
            className="size-4 text-zinc-500 dark:text-zinc-600"
            fill="rgb(var(--color-zinc-500))"
          />
        </Button>
      </DropdownMenuTrigger>

      <DropdownMenuContent className="" align="end">
        {content && (
          <DropdownMenuItem
            onClick={() => {
              navigator.clipboard.writeText(content)
              toast({
                description: "Content copied to clipboard",
              })
            }}
          >
            Copy content
          </DropdownMenuItem>
        )}
        <DropdownMenuItem
          onClick={() => {
            navigator.clipboard.writeText(dataKey)
          }}
        >
          Copy key
        </DropdownMenuItem>
        <DeleteKeyModal
          deletionType="key"
          name={dataKey}
          showReindex={isValuesSearchSelected && type !== "search"}
          onDeleteConfirm={async (_e, options) => {
            await deleteKey({ keys: [dataKey], reindex: options?.reindex })
          }}
        >
          <DropdownMenuItem
            className="text-red-500 focus:bg-red-500 focus:text-white"
            onSelect={(e) => e.preventDefault()}
          >
            Delete key
          </DropdownMenuItem>
        </DeleteKeyModal>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
