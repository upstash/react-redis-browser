import { useState } from "react"
import { IconDots } from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { useQueryBuilderUI } from "./query-builder-context"
import type { QueryNode } from "./types"

export const NodeActionsMenu = ({ node }: { node: QueryNode }) => {
  const { updateNode } = useQueryBuilderUI()
  const [open, setOpen] = useState(false)

  const handleToggleBoost = () => {
    updateNode(node.id, { boost: node.boost ? undefined : 2 })
  }

  const handleToggleNot = () => {
    updateNode(node.id, { not: !node.not })
  }

  return (
    <DropdownMenu open={open} onOpenChange={setOpen}>
      <DropdownMenuTrigger asChild>
        <button
          type="button"
          className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-zinc-300 text-zinc-500 transition-colors hover:text-zinc-700"
        >
          <IconDots size={16} />
        </button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        <DropdownMenuItem onClick={handleToggleBoost}>
          <div className="flex items-center gap-2">
            <div
              className={`h-4 w-8 rounded-full transition-colors ${
                node.boost === undefined ? "bg-zinc-200" : "bg-emerald-500"
              }`}
            >
              <div
                className={`h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  node.boost === undefined ? "translate-x-0" : "translate-x-4"
                }`}
              />
            </div>
            <span>Boost</span>
          </div>
        </DropdownMenuItem>
        <DropdownMenuItem onClick={handleToggleNot}>
          <div className="flex items-center gap-2">
            <div
              className={`h-4 w-8 rounded-full transition-colors ${
                node.not ? "bg-emerald-500" : "bg-zinc-200"
              }`}
            >
              <div
                className={`h-4 w-4 transform rounded-full bg-white shadow transition-transform ${
                  node.not ? "translate-x-4" : "translate-x-0"
                }`}
              />
            </div>
            <span>Not</span>
          </div>
        </DropdownMenuItem>
      </DropdownMenuContent>
    </DropdownMenu>
  )
}
