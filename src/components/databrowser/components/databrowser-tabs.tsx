import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import type { TabId } from "@/store"
import { useDatabrowserStore } from "@/store"
import { TabIdProvider } from "@/tab-provider"
import { Tab } from "./tab"
import { useEffect, useState, useRef } from "react"
import {
  DndContext,
  closestCenter,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
  MeasuringStrategy,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import {
  SortableContext,
  horizontalListSortingStrategy,
  useSortable,
} from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"

const SortableTab = ({ id }: { id: TabId }) => {
  const [originalWidth, setOriginalWidth] = useState<number | null>(null);
  const textRef = useRef<HTMLElement | null>(null);
  
  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    resizeObserverConfig: {
      disabled: true
    }
  })
  
  const measureRef = (element: HTMLDivElement | null) => {
    if (element && !originalWidth) {
      const width = element.getBoundingClientRect().width;
      setOriginalWidth(width);
      
      if (element) {
        const textSpan = element.querySelector('span');
        if (textSpan) {
          textRef.current = textSpan as HTMLElement;
        }
      }
    }
    setNodeRef(element);
  };
  useEffect(() => {
    if (textRef.current && isDragging) {
      const originalMaxWidth = textRef.current.style.maxWidth;
      const originalWhiteSpace = textRef.current.style.whiteSpace;
      const originalOverflow = textRef.current.style.overflow;
      const originalTextOverflow = textRef.current.style.textOverflow;
      
      textRef.current.style.maxWidth = 'none';
      textRef.current.style.whiteSpace = 'nowrap';
      textRef.current.style.overflow = 'visible';
      textRef.current.style.textOverflow = 'clip';
      
      return () => {
        if (textRef.current) {
          textRef.current.style.maxWidth = originalMaxWidth;
          textRef.current.style.whiteSpace = originalWhiteSpace;
          textRef.current.style.overflow = originalOverflow;
          textRef.current.style.textOverflow = originalTextOverflow;
        }
      };
    }
  }, [isDragging]);
  useEffect(() => {
    const resizeObserver = new ResizeObserver(entries => {
      if (entries[0]) {
        setOriginalWidth(entries[0].contentRect.width);
      }
    });
    
    return () => resizeObserver.disconnect();
  }, []);
  
  const style = {
    transform: transform ? CSS.Transform.toString({
      ...transform,
      y: 0,
      scaleX: 1,
      scaleY: 1,
    }) : '',
    transition,
    ...(isDragging ? { 
      zIndex: 50,
      minWidth: originalWidth ? `${originalWidth}px` : undefined,
    } : {}),
  }
  
  return (
    <div 
      ref={measureRef} 
      style={style} 
      className={isDragging ? 'cursor-grabbing' : 'cursor-grab'}
      {...attributes} 
      {...listeners}
    >
      <TabIdProvider value={id as TabId}>
        <Tab id={id} />
      </TabIdProvider>
    </div>
  )
}

export const DatabrowserTabs = () => {
  const { tabs, addTab, reorderTabs } = useDatabrowserStore()
  
  const sensors = useSensors(
    useSensor(PointerSensor, {
      activationConstraint: {
        distance: 5,
      },
    })
  )
  
  const handleDragEnd = (event: DragEndEvent) => {
    const { active, over } = event
    
    if (over && active.id !== over.id) {
      const oldIndex = tabs.findIndex(([id]) => id === active.id)
      const newIndex = tabs.findIndex(([id]) => id === over.id)
      
      reorderTabs(oldIndex, newIndex)
    }
  }

  return (
    <div className="relative mb-2 shrink-0">
      <div className="absolute bottom-0 left-0 right-0 -z-10 h-[1px] w-full bg-zinc-200" />

      <div className="scrollbar-hide flex translate-y-[1px] items-center gap-1 overflow-x-scroll pb-[1px] [&::-webkit-scrollbar]:hidden">
        <DndContext
          sensors={sensors}
          collisionDetection={closestCenter}
          onDragEnd={handleDragEnd}
          modifiers={[restrictToHorizontalAxis]}
          measuring={{
            droppable: {
              strategy: MeasuringStrategy.Always,
            },
          }}
        >
          <SortableContext 
            items={tabs.map(([id]) => id)} 
            strategy={horizontalListSortingStrategy}
          >
            {tabs.map(([id]) => (
              <SortableTab key={id} id={id} />
            ))}
          </SortableContext>
        </DndContext>
        <Button
          variant="secondary"
          size="icon-sm"
          onClick={addTab}
          className="mr-1 flex-shrink-0"
          title="Add new tab"
        >
          <IconPlus className="text-zinc-500" size={16} />
        </Button>
      </div>
    </div>
  )
}
