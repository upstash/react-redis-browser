import { useDraggable } from "@dnd-kit/core"

// ============================================================================
// TYPES
// ============================================================================

export type DragHandleProps = {
  ref: React.Ref<HTMLElement>
  listeners: Record<string, unknown>
  attributes: Record<string, unknown>
}

type DraggableItemProps = {
  id: string
  children: React.ReactNode
  isDragActive: boolean
  droppingId: string | null
}

// ============================================================================
// DRAGGABLE ITEM COMPONENT
// ============================================================================

export const DraggableItem = ({ id, children, isDragActive, droppingId }: DraggableItemProps) => {
  const { attributes, listeners, setNodeRef, transform, isDragging, setActivatorNodeRef } =
    useDraggable({ id })

  const style = transform
    ? {
        transform: `translate3d(${transform.x}px, ${transform.y}px, 0)`,
        zIndex: 1000,
      }
    : undefined

  // Hide the original item when dragging (we show DragOverlay instead)
  if (isDragging) {
    return (
      <div ref={setNodeRef} className="opacity-30">
        {children}
      </div>
    )
  }

  // Keep invisible while drop animation is playing for this item
  const isDropAnimating = droppingId === id

  // Clone the child element and pass dragHandleProps
  const childElement = children as React.ReactElement<{
    dragHandleProps?: DragHandleProps
  }>

  const childWithDragHandle =
    typeof children === "object" && children !== null && "type" in childElement ? (
      <childElement.type
        {...childElement.props}
        dragHandleProps={{
          ref: setActivatorNodeRef,
          listeners,
          attributes,
        }}
      />
    ) : (
      children
    )

  return (
    <div
      ref={setNodeRef}
      style={style}
      className={`${isDropAnimating ? "opacity-0" : isDragActive && !isDragging ? "opacity-80" : ""}`}
    >
      {childWithDragHandle}
    </div>
  )
}
