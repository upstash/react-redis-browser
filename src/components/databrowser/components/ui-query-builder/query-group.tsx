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
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"

import { BoostBadge, NodeActionsMenu } from "./condition-common"
import { QueryDndProvider } from "./dnd-context"
import { DraggableItem, type DragHandleProps } from "./draggable-item"
import { DropIndicator, EmptyGroupDropZone } from "./drop-zone"
import { useQueryBuilderUI } from "./query-builder-context"
import { QueryCondition } from "./query-condition"
import { createEmptyCondition, createEmptyGroup } from "./query-parser"
import { type GroupOperator, type QueryNode } from "./types"

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
  droppingId: string | null
  dragHandleProps?: DragHandleProps
}

const ChildRow = ({
  groupId,
  child,
  depth,
  activeOverId,
  droppingId,
}: {
  groupId: string
  child: QueryNode
  depth: number
  activeOverId?: string | null
  droppingId: string | null
}) => (
  <div>
    <DropIndicator
      id={`drop-${groupId}-${child.id}`}
      isOver={activeOverId === `drop-${groupId}-${child.id}`}
    />
    <DraggableItem id={child.id} droppingId={droppingId}>
      {child.type === "condition" ? (
        <QueryCondition node={child} />
      ) : (
        <InnerGroup
          node={child}
          depth={depth + 1}
          activeOverId={activeOverId}
          droppingId={droppingId}
        />
      )}
    </DraggableItem>
  </div>
)

// ============================================================================
// INNER GROUP (Non-root)
// ============================================================================

const InnerGroup = ({
  node,
  isRoot = false,
  depth,
  activeOverId,
  droppingId,
  dragHandleProps,
}: InnerGroupProps) => {
  const { fieldInfos, updateNode, deleteNode, addChildToGroup } = useQueryBuilderUI()

  const handleOperatorChange = (value: GroupOperator) => {
    updateNode(node.id, { groupOperator: value })
  }

  const handleAddCondition = () => {
    addChildToGroup(node.id, createEmptyCondition(fieldInfos))
  }

  const handleAddGroup = () => {
    const newGroup = createEmptyGroup("and")
    ;(newGroup as QueryNode & { type: "group" }).children = [createEmptyCondition(fieldInfos)]
    addChildToGroup(node.id, newGroup)
  }

  const handleDeleteGroup = () => {
    deleteNode(node.id)
  }

  return (
    <div>
      {/* Header with operator select - no left padding */}
      <div className="group/group flex items-center gap-1 px-1">
        {/* Drag handle for non-root groups */}
        {!isRoot && (
          <div
            ref={dragHandleProps?.ref as React.Ref<HTMLDivElement>}
            className="flex cursor-grab items-center px-1 text-zinc-400"
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

        {node.boost !== undefined && <BoostBadge node={node} />}

        {/* Actions (settings menu & delete) - visible on hover */}
        {!isRoot && (
          <div
            className={`flex -translate-x-[2px] items-center gap-1 opacity-0 transition-all duration-100 group-hover/group:translate-x-0 group-hover/group:opacity-100 has-[[data-state=open]]:translate-x-0 has-[[data-state=open]]:opacity-100`}
          >
            <NodeActionsMenu node={node} />
            <button
              type="button"
              onClick={handleDeleteGroup}
              className={`flex h-[26px] w-[26px] items-center justify-center rounded-md border border-zinc-300 text-zinc-500 transition-colors hover:text-red-500`}
            >
              <IconX size={16} />
            </button>
          </div>
        )}
      </div>

      {/* Children with drop indicators - this gets the left border */}
      <div className={`min-h-[20px] ${isRoot ? "" : "ml-[15px] border-l-2 border-zinc-200 pl-3"}`}>
        {node.children.length === 0 ? (
          <EmptyGroupDropZone groupId={node.id} isOver={activeOverId === `drop-${node.id}-end`} />
        ) : (
          <>
            {node.children.map(
              (child) =>
                !child.not && (
                  <ChildRow
                    key={child.id}
                    groupId={node.id}
                    child={child}
                    depth={depth}
                    activeOverId={activeOverId}
                    droppingId={droppingId}
                  />
                )
            )}

            {/* MUST NOT label */}
            {node.children.some((child) => child.not) && (
              <Tooltip delayDuration={200}>
                <TooltipTrigger asChild>
                  <div className="ml-2 mt-2 flex h-[26px] w-fit cursor-default select-none items-center rounded-md border border-zinc-300 bg-amber-50 px-2 text-sm font-medium capitalize text-amber-800">
                    Must Not
                  </div>
                </TooltipTrigger>
                <TooltipContent side="right" className="max-w-xs">
                  <p>
                    Keys matching any of the conditions below are excluded from the results.{" "}
                    <a
                      href="https://upstash-search.mintlify.app/redis/search/query-operators/boolean-operators/must-not"
                      target="_blank"
                      rel="noopener noreferrer"
                      className="underline"
                    >
                      Learn more
                    </a>
                  </p>
                </TooltipContent>
              </Tooltip>
            )}

            {node.children.map(
              (child) =>
                child.not && (
                  <ChildRow
                    key={child.id}
                    groupId={node.id}
                    child={child}
                    depth={depth}
                    activeOverId={activeOverId}
                    droppingId={droppingId}
                  />
                )
            )}

            {/* Drop indicator AFTER the last item */}
            <DropIndicator
              id={`drop-${node.id}-end`}
              isOver={activeOverId === `drop-${node.id}-end`}
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
  const [droppingId, setDroppingId] = useState<string | null>(null)

  if (node.type !== "group") return

  // Only the root should have the DndContext
  if (!isRoot) {
    return (
      <InnerGroup
        node={node}
        isRoot={isRoot}
        depth={depth}
        activeOverId={activeOverId}
        droppingId={droppingId}
      />
    )
  }

  return (
    <QueryDndProvider
      rootNode={node}
      setActiveOverId={setActiveOverId}
      setDroppingId={setDroppingId}
    >
      <InnerGroup
        node={node}
        isRoot={isRoot}
        depth={depth}
        activeOverId={activeOverId}
        droppingId={droppingId}
      />
    </QueryDndProvider>
  )
}
