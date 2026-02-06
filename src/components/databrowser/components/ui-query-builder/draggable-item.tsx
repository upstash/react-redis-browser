import { useDraggable } from "@dnd-kit/core"

export type DragHandleProps = {
  ref: React.Ref<HTMLElement>
  listeners: Record<string, unknown>
  attributes: Record<string, unknown>
}

export const DraggableItem = ({
  id,
  children,
  droppingId,
}: {
  id: string
  children: React.ReactNode
  droppingId: string | null
}) => {
  const { attributes, listeners, setNodeRef, isDragging, setActivatorNodeRef } = useDraggable({
    id,
  })

  const isDropAnimating = droppingId === id

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
      className={`${isDropAnimating ? "opacity-0" : isDragging ? "opacity-30" : ""}`}
    >
      {childWithDragHandle}
    </div>
  )
}
