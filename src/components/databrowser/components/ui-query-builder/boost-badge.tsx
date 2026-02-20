import { useState } from "react"

import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { DocsLink } from "../docs-link"
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
      <Tooltip delayDuration={200}>
        <TooltipTrigger asChild>
          <span className={`flex h-full cursor-default items-center px-2 ${labelBg} ${textColor}`}>
            {isNegative ? "Demote" : "Boost"}
          </span>
        </TooltipTrigger>
        <TooltipContent side="bottom" className="max-w-xs">
          <span>
            {isNegative
              ? `Multiplies this condition's score by ${node.boost ?? 0}, subtracting from the total.`
              : `Multiplies this condition's score by ${node.boost ?? 0}.`}
          </span>
          <DocsLink href="https://upstash-search.mintlify.app/redis/search/query-operators/boolean-operators/boost" />
        </TooltipContent>
      </Tooltip>
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
