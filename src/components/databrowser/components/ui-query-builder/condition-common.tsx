import { useState } from "react"
import { IconDots } from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"

import { DynamicWidthInput } from "./dynamic-width-input"
import { useQueryBuilderUI } from "./query-builder-context"
import type { QueryNode } from "./types"

export const BoostBadge = ({
  node,
  static: isStatic,
}: {
  node: QueryNode
  /** For drag overlays */
  static?: boolean
}) => {
  const { updateNode } = useQueryBuilderUI()
  // Local state allows typing intermediate values like "-" before completing "-2"
  const [localValue, setLocalValue] = useState(String(node.boost ?? 0))
  const [isFocused, setIsFocused] = useState(false)

  // Sync local value when boost changes externally (and input is not focused)
  const boostStr = String(node.boost ?? 0)
  if (!isFocused && localValue !== boostStr) {
    setLocalValue(boostStr)
  }

  const handleChange = (value: string) => {
    setLocalValue(value)
    // Only commit valid numbers to parent
    const numValue = Number(value)
    if (!Number.isNaN(numValue) && value !== "" && value !== "-") {
      updateNode(node.id, { boost: numValue })
    }
  }

  const handleBlur = () => {
    setIsFocused(false)
    // On blur, if value is invalid, reset to current boost
    const numValue = Number(localValue)
    if (Number.isNaN(numValue) || localValue === "" || localValue === "-") {
      setLocalValue(String(node.boost ?? 0))
    }
  }

  const isNegative = (node.boost ?? 0) < 0
  const labelBg = isNegative ? "bg-red-50" : "bg-purple-50"
  const textColor = isNegative ? "text-red-800" : "text-purple-800"

  return (
    <span className="relative flex h-[26px] items-center overflow-hidden rounded-md border border-zinc-300 text-sm font-medium">
      <span className={`flex h-full items-center px-2 ${labelBg} ${textColor}`}>
        {isNegative ? "Demote" : "Boost"}
      </span>
      {isStatic ? (
        <span className={`px-2 ${textColor}`}>{node.boost}</span>
      ) : (
        <span className="flex h-full items-center bg-white px-2">
          <DynamicWidthInput
            value={localValue}
            onChange={handleChange}
            onFocus={() => setIsFocused(true)}
            onBlur={handleBlur}
            className={`text-sm ${textColor}`}
            minWidth={8}
          />
        </span>
      )}
    </span>
  )
}

export const NotBadge = () => (
  <span className="flex h-[26px] items-center rounded-md border border-zinc-300 bg-amber-50 px-2 text-sm font-medium text-amber-800">
    Not
  </span>
)

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
