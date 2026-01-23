import { DragOverlay as DndKitDragOverlay } from "@dnd-kit/core"
import { IconGripVertical } from "@tabler/icons-react"

import { BoostBadge, NotBadge } from "./condition-common"
import { QueryCondition } from "./query-condition"
import type { QueryNode } from "./types"

export const QueryDragOverlay = ({
  activeNode,
  onDropAnimationComplete,
}: {
  activeNode: QueryNode | null
  onDropAnimationComplete: () => void
}) => {
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
        <div className="relative -mt-1">
          {/* Background layer - fades on drop */}
          <div className="drag-overlay-bg absolute -bottom-1 -top-1 left-0 right-0 rounded-md border border-zinc-300 bg-zinc-100/90 shadow-md" />
          {/* Content layer - stays solid */}
          <div className="relative">
            <QueryCondition node={activeNode} isDragging />
          </div>
        </div>
      ) : activeNode && activeNode.type === "group" ? (
        <div className="relative">
          {/* Background layer - fades on drop */}
          <div className="drag-overlay-bg absolute -bottom-1 -top-1 left-0 right-0 rounded-md border border-zinc-300 bg-zinc-100/90 shadow-md" />
          {/* Content layer - stays solid, matches InnerGroup header */}
          <div className="relative flex items-center gap-1">
            {/* Drag handle */}
            <div className="flex cursor-grab items-center text-zinc-400">
              <IconGripVertical size={16} />
            </div>

            {/* Operator badge (styled like the select trigger) */}
            <div className="flex h-[26px] w-16 items-center justify-between rounded-md border border-zinc-300 bg-blue-50 px-2 text-sm font-medium capitalize text-zinc-700">
              <span>{activeNode.groupOperator === "and" ? "And" : "Or"}</span>
              <svg
                className="text-zinc-400"
                width="16"
                height="16"
                viewBox="0 0 16 16"
                fill="none"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  d="M4 6L8 10L12 6"
                  stroke="currentColor"
                  strokeOpacity="0.4"
                  strokeWidth="1.2"
                  strokeLinecap="round"
                  strokeLinejoin="round"
                />
              </svg>
            </div>

            {activeNode.boost !== undefined && <BoostBadge node={activeNode} static />}

            {activeNode.not && <NotBadge />}
          </div>
        </div>
      ) : null}
    </DndKitDragOverlay>
  )
}
