import { useDroppable } from "@dnd-kit/core"

import { cn } from "@/lib/utils"

// ============================================================================
// DROP INDICATOR (line between items)
// ============================================================================

type DropIndicatorProps = {
  id: string
  isOver: boolean
}

export const DropIndicator = ({ id, isOver }: DropIndicatorProps) => {
  const { setNodeRef } = useDroppable({ id })

  return (
    <div ref={setNodeRef} className={`relative flex h-2 items-center`}>
      <div
        className={cn(
          "h-1 w-full rounded-full bg-blue-500 transition-opacity duration-100",
          isOver ? "opacity-100" : "opacity-0"
        )}
      />
    </div>
  )
}

// ============================================================================
// EMPTY GROUP DROP ZONE (when a group has no children)
// ============================================================================

type EmptyGroupDropZoneProps = {
  groupId: string
  isOver: boolean
}

export const EmptyGroupDropZone = ({ groupId, isOver }: EmptyGroupDropZoneProps) => {
  const { setNodeRef } = useDroppable({ id: `drop-${groupId}-0` })

  return (
    <div
      ref={setNodeRef}
      className={`mt-2 flex h-8 items-center justify-center rounded-md border border-dashed text-sm transition-all ${
        isOver ? "border-blue-500 bg-blue-50 text-blue-600" : "border-zinc-300 text-zinc-400"
      }`}
    >
      Drop items here or add a condition
    </div>
  )
}
