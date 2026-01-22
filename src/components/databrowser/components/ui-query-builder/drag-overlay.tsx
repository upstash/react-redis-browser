import { DragOverlay as DndKitDragOverlay } from "@dnd-kit/core"
import { IconChevronDown, IconGripVertical } from "@tabler/icons-react"

import { BoostBadge, NotBadge } from "./condition-common"
import { QueryCondition } from "./query-condition"
import type { QueryNode } from "./types"

// ============================================================================
// TYPES
// ============================================================================

type QueryDragOverlayProps = {
  activeNode: QueryNode | null
  onDropAnimationComplete: () => void
}

// ============================================================================
// DRAG OVERLAY COMPONENT
// ============================================================================

export const QueryDragOverlay = ({
  activeNode,
  onDropAnimationComplete,
}: QueryDragOverlayProps) => {
  return (
    <DndKitDragOverlay
      dropAnimation={{
        duration: 200,
        easing: "ease-out",
        sideEffects: ({ dragOverlay }) => {
          // Add 'dropping' class to trigger bg fade animation
          dragOverlay.node.classList.add("dropping")
          return () => {
            // Don't remove the class - removing it causes styles to revert (flash) before unmount
            // Animation complete - show the target item
            onDropAnimationComplete()
          }
        },
      }}
    >
      {activeNode && activeNode.type === "condition" ? (
        <div className="relative">
          {/* Background layer - fades on drop */}
          <div className="drag-overlay-bg absolute inset-0 rounded-md border border-zinc-300 bg-zinc-100/90 shadow-md" />
          {/* Content layer - stays solid */}
          <div className="relative">
            <QueryCondition node={activeNode} isDragging />
          </div>
        </div>
      ) : activeNode && activeNode.type === "group" ? (
        <div className="relative">
          {/* Background layer - fades on drop */}
          <div className="drag-overlay-bg absolute inset-0 rounded-md border border-zinc-300 bg-zinc-100/90 shadow-md" />
          {/* Content layer - stays solid, matches InnerGroup header */}
          <div className="relative flex items-center gap-1 py-1">
            {/* Drag handle */}
            <div className="flex cursor-grab items-center text-zinc-400">
              <IconGripVertical size={16} />
            </div>

            {/* Operator badge (styled like the select trigger) */}
            <div className="flex h-[26px] w-16 items-center justify-between rounded-md border border-zinc-300 bg-blue-50 px-2 text-sm font-medium capitalize text-zinc-700">
              <span>{activeNode.groupOperator === "and" ? "And" : "Or"}</span>
              <IconChevronDown size={12} className="text-zinc-400" />
            </div>

            {/* Boost badge */}
            {activeNode.boost !== undefined && <BoostBadge boost={activeNode.boost} static />}

            {/* Not badge */}
            {activeNode.not && <NotBadge />}
          </div>
        </div>
      ) : null}
    </DndKitDragOverlay>
  )
}
