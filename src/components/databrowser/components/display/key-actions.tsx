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

export function KeyActions({ dataKey, content }: { dataKey: string; content?: string }) {
  const { mutateAsync: deleteKey } = useDeleteKey()

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
        <DeleteKeyModal deletionType="key" onDeleteConfirm={async () => await deleteKey(dataKey)}>
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
