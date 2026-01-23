import { useState, type ReactNode } from "react"
import {
  DndContext,
  PointerSensor,
  rectIntersection,
  useSensor,
  useSensors,
  type DragEndEvent,
  type DragOverEvent,
  type DragStartEvent,
  type UniqueIdentifier,
} from "@dnd-kit/core"

import { QueryDragOverlay } from "./drag-overlay"
import { useQueryBuilderUI } from "./query-builder-context"
import type { QueryNode } from "./types"

type QueryDndProviderProps = {
  children: ReactNode
  rootNode: QueryNode & { type: "group" }
  setActiveOverId: (id: string | null) => void
  setDroppingId: (id: string | null) => void
}

export const QueryDndProvider = ({
  children,
  rootNode,
  setActiveOverId,
  setDroppingId,
}: QueryDndProviderProps) => {
  const { moveNode } = useQueryBuilderUI()
  const [activeId, setActiveId] = useState<UniqueIdentifier | null>(null)

  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 8,
      },
    })
  )

  const handleDragStart = (event: DragStartEvent) => {
    setDroppingId(null) // Clear any previous dropping state
    setActiveId(event.active.id)
  }

  const handleDragOver = (event: DragOverEvent) => {
    const { over } = event
    setActiveOverId(over ? String(over.id) : null)
  }

  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event

    // Set droppingId before clearing activeId so item stays invisible during animation
    if (over) {
      setDroppingId(String(active.id))
    }

    setActiveId(null)
    setActiveOverId(null)

    if (!over) return

    const activeIdStr = String(active.id)
    const overIdStr = String(over.id)

    // Find the dragged node
    const draggedNode = findNodeById(rootNode, activeIdStr)
    if (!draggedNode) return

    // Find current parent of the dragged node
    const currentParent = findParentGroup(rootNode, activeIdStr)
    if (!currentParent) return

    // Parse the drop indicator ID: "drop-{groupId}-{index}"
    if (!overIdStr.startsWith("drop-")) return

    const parts = overIdStr.split("-")
    if (parts.length < 3) return

    const targetGroupId = parts[1]
    const targetIndex = Number.parseInt(parts[2], 10)

    if (Number.isNaN(targetIndex)) return

    // Don't move if dropping in same position
    const currentIndex = currentParent.children.findIndex((c) => c.id === activeIdStr)
    if (
      currentParent.id === targetGroupId && // Same group: if dropping at current or current+1 position, it's a no-op
      (targetIndex === currentIndex || targetIndex === currentIndex + 1)
    ) {
      return
    }

    // Adjust target index if moving within same group and moving down
    let adjustedIndex = targetIndex
    if (currentParent.id === targetGroupId && currentIndex < targetIndex) {
      adjustedIndex = targetIndex - 1
    }

    // Don't allow dropping a group into itself
    if (draggedNode.type === "group") {
      const isDescendant = (parent: QueryNode, childId: string): boolean => {
        if (parent.id === childId) return true
        if (parent.type === "group") {
          return parent.children.some((c) => isDescendant(c, childId))
        }
        return false
      }
      if (isDescendant(draggedNode, targetGroupId)) {
        return
      }
    }

    moveNode(activeIdStr, targetGroupId, adjustedIndex)
  }

  // Get the active node for the drag overlay
  const activeNode = activeId ? findNodeById(rootNode, String(activeId)) : null

  return (
    <DndContext
      sensors={sensors}
      collisionDetection={rectIntersection}
      onDragStart={handleDragStart}
      onDragOver={handleDragOver}
      onDragEnd={handleDragEnd}
    >
      {children}

      <QueryDragOverlay
        activeNode={activeNode}
        onDropAnimationComplete={() => setDroppingId(null)}
      />
    </DndContext>
  )
}

const findNodeById = (root: QueryNode, id: string): QueryNode | null => {
  if (root.id === id) return root
  if (root.type === "group") {
    for (const child of root.children) {
      const found = findNodeById(child, id)
      if (found) return found
    }
  }
  return null
}

const findParentGroup = (
  root: QueryNode,
  targetId: string
): (QueryNode & { type: "group" }) | null => {
  if (root.type !== "group") return null

  for (const child of root.children) {
    if (child.id === targetId) {
      return root
    }
    if (child.type === "group") {
      const found = findParentGroup(child, targetId)
      if (found) return found
    }
  }

  return null
}
