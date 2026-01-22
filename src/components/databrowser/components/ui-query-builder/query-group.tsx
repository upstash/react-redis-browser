import { useState } from "react"
import { IconGripVertical, IconPlus, IconX } from "@tabler/icons-react"

import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { BoostBadge, NodeActionsMenu, NotBadge } from "./condition-common"
import { QueryDndProvider } from "./dnd-context"
import { DraggableItem, type DragHandleProps } from "./draggable-item"
import { DropIndicator, EmptyGroupDropZone } from "./drop-zone"
import { useQueryBuilderUI } from "./query-builder-context"
import { QueryCondition } from "./query-condition"
import { createEmptyCondition, createEmptyGroup } from "./query-parser"
import { type GroupOperator, type QueryNode } from "./types"

// ============================================================================
// TYPES
// ============================================================================

type QueryGroupProps = {
  node: QueryNode
  isRoot?: boolean
  depth: number
}

type InnerGroupProps = {
  node: QueryNode & { type: "group" }
  isRoot?: boolean
  depth: number
  activeOverId?: string | null
  isDragActive: boolean
  droppingId: string | null
  dragHandleProps?: DragHandleProps
}

// ============================================================================
// INNER GROUP (Non-root)
// ============================================================================

const InnerGroup = ({
  node,
  isRoot = false,
  depth,
  activeOverId,
  isDragActive,
  droppingId,
  dragHandleProps,
}: InnerGroupProps) => {
  const { fieldNames, updateNode, deleteNode, addChildToGroup } = useQueryBuilderUI()
  const [menuOpen, setMenuOpen] = useState(false)

  const handleOperatorChange = (value: GroupOperator) => {
    updateNode(node.id, { groupOperator: value })
  }

  const handleAddCondition = () => {
    addChildToGroup(node.id, createEmptyCondition(fieldNames[0]))
  }

  const handleAddGroup = () => {
    const newGroup = createEmptyGroup("and")
    ;(newGroup as QueryNode & { type: "group" }).children = [createEmptyCondition(fieldNames[0])]
    addChildToGroup(node.id, newGroup)
  }

  const handleDeleteGroup = () => {
    deleteNode(node.id)
  }

  const handleToggleNot = () => {
    updateNode(node.id, { not: !node.not })
  }

  const handleToggleBoost = () => {
    updateNode(node.id, { boost: node.boost ? undefined : 2 })
  }

  const handleBoostChange = (value: string) => {
    const numValue = Number(value)
    if (!Number.isNaN(numValue)) {
      updateNode(node.id, { boost: numValue })
    }
  }

  return (
    <div>
      {/* Header with operator select - no left padding */}
      <div className="group/group flex items-center gap-1">
        {/* Drag handle for non-root groups */}
        {!isRoot && (
          <div
            ref={dragHandleProps?.ref as React.Ref<HTMLDivElement>}
            className="flex cursor-grab items-center text-zinc-400"
            {...(dragHandleProps?.attributes as React.HTMLAttributes<HTMLDivElement>)}
            {...(dragHandleProps?.listeners as React.HTMLAttributes<HTMLDivElement>)}
          >
            <IconGripVertical size={16} />
          </div>
        )}

        {/* Group operator selector */}
        <Select value={node.groupOperator} onValueChange={handleOperatorChange}>
          <SelectTrigger className="h-[26px] w-16 gap-3 rounded-md border-zinc-300 bg-blue-50 px-2 text-sm font-medium capitalize text-zinc-700 [&>svg]:text-zinc-400">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="and">And</SelectItem>
            <SelectItem value="or">Or</SelectItem>
          </SelectContent>
        </Select>

        {/* Add button */}
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button
              type="button"
              className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-zinc-300 text-zinc-500 transition-colors hover:text-zinc-700"
            >
              <IconPlus size={16} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="start">
            <DropdownMenuItem onClick={handleAddCondition}>Add Condition</DropdownMenuItem>
            <DropdownMenuItem onClick={handleAddGroup}>Add Group</DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>

        {/* Boost badge */}
        {node.boost !== undefined && (
          <BoostBadge boost={node.boost} onBoostChange={handleBoostChange} />
        )}

        {/* Not badge */}
        {node.not && <NotBadge />}

        {/* Actions (settings menu) - visible on hover, hidden for root */}
        {!isRoot && (
          <div
            className={`flex items-center gap-1 transition-opacity ${
              menuOpen ? "opacity-100" : "opacity-0 group-hover/group:opacity-100"
            }`}
          >
            <NodeActionsMenu
              boost={node.boost}
              not={node.not}
              onToggleBoost={handleToggleBoost}
              onToggleNot={handleToggleNot}
              open={menuOpen}
              onOpenChange={setMenuOpen}
            />
          </div>
        )}

        {/* Delete button for non-root groups */}
        {!isRoot && (
          <button
            type="button"
            onClick={handleDeleteGroup}
            className={`flex h-[26px] w-[26px] items-center justify-center rounded-md border border-zinc-300 text-zinc-500 transition-opacity hover:text-red-500 ${
              menuOpen ? "opacity-100" : "opacity-0 group-hover/group:opacity-100"
            }`}
          >
            <IconX size={16} />
          </button>
        )}
      </div>

      {/* Children with drop indicators - this gets the left border */}
      <div className={`min-h-[20px] ${isRoot ? "" : "ml-2 border-l-2 border-zinc-200 pl-3"}`}>
        {node.children.length === 0 ? (
          <EmptyGroupDropZone groupId={node.id} isOver={activeOverId === `drop-${node.id}-0`} />
        ) : (
          <>
            {node.children.map((child, index) => (
              <div key={child.id}>
                {/* Drop indicator BEFORE this item */}
                <DropIndicator
                  id={`drop-${node.id}-${index}`}
                  isOver={activeOverId === `drop-${node.id}-${index}`}
                />

                {/* The item itself */}
                <DraggableItem id={child.id} isDragActive={isDragActive} droppingId={droppingId}>
                  {child.type === "condition" ? (
                    <QueryCondition node={child} />
                  ) : (
                    <InnerGroup
                      node={child}
                      depth={depth + 1}
                      activeOverId={activeOverId}
                      isDragActive={isDragActive}
                      droppingId={droppingId}
                    />
                  )}
                </DraggableItem>
              </div>
            ))}

            {/* Drop indicator AFTER the last item */}
            <DropIndicator
              id={`drop-${node.id}-${node.children.length}`}
              isOver={activeOverId === `drop-${node.id}-${node.children.length}`}
            />
          </>
        )}
      </div>
    </div>
  )
}

// ============================================================================
// ROOT GROUP (With DndContext)
// ============================================================================

export const QueryGroup = ({ node, isRoot = false, depth }: QueryGroupProps) => {
  const [activeOverId, setActiveOverId] = useState<string | null>(null)
  const [isDragActive, setIsDragActive] = useState(false)
  const [droppingId, setDroppingId] = useState<string | null>(null)

  if (node.type !== "group") {
    return null
  }

  // Only the root should have the DndContext
  if (!isRoot) {
    return (
      <InnerGroup
        node={node}
        isRoot={isRoot}
        depth={depth}
        activeOverId={activeOverId}
        isDragActive={isDragActive}
        droppingId={droppingId}
      />
    )
  }

  return (
    <QueryDndProvider
      rootNode={node}
      setActiveOverId={setActiveOverId}
      setIsDragActive={setIsDragActive}
      setDroppingId={setDroppingId}
    >
      <InnerGroup
        node={node}
        isRoot={isRoot}
        depth={depth}
        activeOverId={activeOverId}
        isDragActive={isDragActive}
        droppingId={droppingId}
      />
    </QueryDndProvider>
  )
}
