import { useCallback, useEffect, useMemo, useRef, useState } from "react"
import type { TabData, TabId } from "@/store"
import { useDatabrowserRootRef, useDatabrowserStore } from "@/store"
import { TabIdProvider } from "@/tab-provider"
import {
  closestCenter,
  DndContext,
  MeasuringStrategy,
  PointerSensor,
  useSensor,
  useSensors,
  type DragEndEvent,
} from "@dnd-kit/core"
import { restrictToHorizontalAxis } from "@dnd-kit/modifiers"
import { horizontalListSortingStrategy, SortableContext, useSortable } from "@dnd-kit/sortable"
import { CSS } from "@dnd-kit/utilities"
import { IconChevronDown, IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandItem,
  CommandList,
} from "@/components/ui/command"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { Tab } from "./tab"

const SortableTab = ({ id }: { id: TabId }) => {
  const [originalWidth, setOriginalWidth] = useState<number | null>(null)
  const textRef = useRef<HTMLElement | null>(null)
  const { tabs } = useDatabrowserStore()
  const tabData = tabs.find(([tabId]) => tabId === id)?.[1]
  const isPinned = tabData?.pinned

  const { attributes, listeners, setNodeRef, transform, transition, isDragging } = useSortable({
    id,
    disabled: isPinned,
    resizeObserverConfig: {
      disabled: true,
    },
  })

  const measureRef = (element: HTMLDivElement | null) => {
    if (element && !originalWidth) {
      const width = element.getBoundingClientRect().width
      setOriginalWidth(width)

      if (element) {
        const textSpan = element.querySelector("span")
        if (textSpan) {
          textRef.current = textSpan as HTMLElement
        }
      }
    }
    setNodeRef(element)
  }
  useEffect(() => {
    if (textRef.current && isDragging) {
      const originalMaxWidth = textRef.current.style.maxWidth
      const originalWhiteSpace = textRef.current.style.whiteSpace
      const originalOverflow = textRef.current.style.overflow
      const originalTextOverflow = textRef.current.style.textOverflow

      textRef.current.style.maxWidth = "none"
      textRef.current.style.whiteSpace = "nowrap"
      textRef.current.style.overflow = "visible"
      textRef.current.style.textOverflow = "clip"

      return () => {
        if (textRef.current) {
          textRef.current.style.maxWidth = originalMaxWidth
          textRef.current.style.whiteSpace = originalWhiteSpace
          textRef.current.style.overflow = originalOverflow
          textRef.current.style.textOverflow = originalTextOverflow
        }
      }
    }
  }, [isDragging])
  useEffect(() => {
    const resizeObserver = new ResizeObserver((entries) => {
      if (entries[0]) {
        setOriginalWidth(entries[0].contentRect.width)
      }
    })

    return () => resizeObserver.disconnect()
  }, [])

  const style = {
    transform: transform
      ? CSS.Transform.toString({
          ...transform,
          y: 0,
          scaleX: 1,
          scaleY: 1,
        })
      : "",
    transition,
    ...(isDragging
      ? {
          zIndex: 50,
          minWidth: originalWidth ? `${originalWidth}px` : undefined,
        }
      : {}),
  }

  return (
    <div
      ref={measureRef}
      style={style}
      className={isDragging ? "cursor-grabbing" : isPinned ? "cursor-default" : "cursor-grab"}
      {...attributes}
      {...(isPinned ? {} : listeners)}
    >
      <TabIdProvider value={id as TabId}>
        <Tab id={id} />
      </TabIdProvider>
    </div>
  )
}

export const DatabrowserTabs = () => {
  const { tabs, reorderTabs, selectedTab, selectTab } = useDatabrowserStore()

  // Sort tabs with pinned tabs first
  const sortedTabs = useMemo(() => {
    return [...tabs].sort(([, a], [, b]) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    })
  }, [tabs])

  const scrollRef = useRef<HTMLDivElement | null>(null)
  const [hasLeftShadow, setHasLeftShadow] = useState(false)
  const [hasRightShadow, setHasRightShadow] = useState(false)
  const [isOverflow, setIsOverflow] = useState(false)

  // Attach a non-passive wheel listener so we can preventDefault when translating vertical wheel to horizontal scroll
  useEffect(() => {
    const el = scrollRef.current
    if (!el) return

    const onWheel = (event: WheelEvent) => {
      if (el.scrollWidth <= el.clientWidth) return
      const primaryDelta =
        Math.abs(event.deltaY) > Math.abs(event.deltaX) ? event.deltaY : event.deltaX
      if (primaryDelta !== 0) {
        el.scrollLeft += primaryDelta
        event.preventDefault()
        // Ensure shadow state updates after scrolling
        requestAnimationFrame(() => {
          const { scrollLeft, scrollWidth, clientWidth } = el
          setHasLeftShadow(scrollLeft > 0)
          setHasRightShadow(scrollLeft + clientWidth < scrollWidth - 1)
          setIsOverflow(scrollWidth > clientWidth + 1)
        })
      }
    }

    el.addEventListener("wheel", onWheel, { passive: false })
    return () => {
      el.removeEventListener("wheel", onWheel as EventListener)
    }
  }, [])

  const recomputeShadows = useCallback(() => {
    const el = scrollRef.current
    if (!el) return
    const { scrollLeft, scrollWidth, clientWidth } = el
    setHasLeftShadow(scrollLeft > 0)
    setHasRightShadow(scrollLeft + clientWidth < scrollWidth - 1)
    setIsOverflow(scrollWidth > clientWidth + 1)
  }, [])

  useEffect(() => {
    recomputeShadows()
    const el = scrollRef.current
    if (!el) return
    const onResize = () => recomputeShadows()
    window.addEventListener("resize", onResize)
    const obs = new ResizeObserver(onResize)
    obs.observe(el)
    return () => {
      window.removeEventListener("resize", onResize)
      obs.disconnect()
    }
  }, [recomputeShadows])

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

      <div className="flex translate-y-[1px] items-center gap-1">
        {/* Scrollable tabs area */}
        <div className="relative min-w-0 flex-1">
          <div
            className={`tabs-shadow-left pointer-events-none absolute left-0 top-0 z-10 h-full w-6 transition-opacity duration-200 ${
              hasLeftShadow ? "opacity-100" : "opacity-0"
            }`}
          />
          <div
            className={`tabs-shadow-right pointer-events-none absolute right-0 top-0 z-10 h-full w-6 transition-opacity duration-200 ${
              hasRightShadow ? "opacity-100" : "opacity-0"
            }`}
          />

          <div
            ref={scrollRef}
            onScroll={recomputeShadows}
            className="scrollbar-hide flex min-w-0 flex-1 items-center gap-1 overflow-x-auto pb-[1px] [&::-webkit-scrollbar]:hidden"
          >
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
                items={sortedTabs.map(([id]) => id)}
                strategy={horizontalListSortingStrategy}
              >
                {selectedTab && sortedTabs.map(([id]) => <SortableTab key={id} id={id} />)}
              </SortableContext>
            </DndContext>
            {!isOverflow && (
              <div className="flex items-center gap-1 pl-1 pr-1">
                <AddTabButton />
              </div>
            )}
          </div>
        </div>

        {/* Fixed right controls: search + add */}
        <div className="flex items-center gap-1 pl-1">
          {isOverflow && <AddTabButton />}
          {tabs.length > 1 && <TabsListButton tabs={tabs} onSelectTab={selectTab} />}
        </div>
      </div>
    </div>
  )
}

function AddTabButton() {
  const { addTab, selectTab } = useDatabrowserStore()
  const rootRef = useDatabrowserRootRef()

  const handleAddTab = () => {
    const tabsId = addTab()
    selectTab(tabsId)

    setTimeout(() => {
      const tab = rootRef?.current?.querySelector(`#tab-${tabsId}`)
      if (!tab) return

      tab.scrollIntoView({ behavior: "smooth" })
    }, 20)
  }

  return (
    <Button
      aria-label="Add new tab"
      variant="secondary"
      size="icon-sm"
      onClick={handleAddTab}
      className="flex-shrink-0"
    >
      <IconPlus className="text-zinc-500" size={16} />
    </Button>
  )
}

function TabsListButton({
  tabs,
  onSelectTab,
}: {
  tabs: [TabId, TabData][]
  onSelectTab: (id: TabId) => void
}) {
  const [open, setOpen] = useState(false)

  const sorted = useMemo(() => {
    return [...tabs].sort(([, a], [, b]) => {
      if (a.pinned && !b.pinned) return -1
      if (!a.pinned && b.pinned) return 1
      return 0
    })
  }, [tabs])

  const rootRef = useDatabrowserRootRef()

  const handleSelectTab = (id: TabId) => {
    onSelectTab(id)
    setOpen(false)

    setTimeout(() => {
      const tab = rootRef?.current?.querySelector(`#tab-${id}`)
      if (!tab) return

      tab.scrollIntoView({ behavior: "smooth" })
    }, 20)
  }

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <PopoverTrigger asChild>
        <Button
          variant="secondary"
          size="sm"
          className="h-7 gap-1 px-2"
          aria-label="Search in tabs"
        >
          <span className="text-xs text-zinc-600">{tabs.length}</span>
          <IconChevronDown className="text-zinc-500" size={16} />
        </Button>
      </PopoverTrigger>
      <PopoverContent className="w-96 p-0" align="end">
        <Command>
          <CommandList>
            <CommandEmpty>No tabs</CommandEmpty>
            <CommandGroup>
              {sorted.map(([_id, item]) => (
                <CommandItem
                  style={{
                    padding: 0,
                  }}
                  key={item.id}
                  value={item.id}
                  onSelect={() => {
                    handleSelectTab(item.id)
                  }}
                >
                  <TabIdProvider value={_id}>
                    <Tab id={_id} isList />
                  </TabIdProvider>
                </CommandItem>
              ))}
            </CommandGroup>
          </CommandList>
        </Command>
      </PopoverContent>
    </Popover>
  )
}
