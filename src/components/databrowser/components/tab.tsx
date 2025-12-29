import type { TabId } from "@/store"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import {
  IconArrowsMinimize,
  IconCopyPlus,
  IconPin,
  IconSearch,
  IconSquareX,
  IconX,
} from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { useOverflow } from "@/hooks/use-overflow"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { TabTypeIcon } from "./tab-type-icon"

export const Tab = ({ id, isList }: { id: TabId; isList?: boolean }) => {
  const { active, search, selectedKey, valuesSearch, pinned, isValuesSearchSelected } = useTab()
  const {
    selectTab,
    removeTab,
    forceRemoveTab,
    tabs,
    togglePinTab,
    duplicateTab,
    closeOtherTabs,
    closeAllButPinned,
  } = useDatabrowserStore()

  const hasPinnedTabs = tabs.some(([, data]) => data.pinned)

  const { ref, isOverflow } = useOverflow()

  const label = isValuesSearchSelected ? valuesSearch.index : search.key || selectedKey
  const iconNode =
    isValuesSearchSelected && valuesSearch.index ? (
      <div className="flex h-[20px] w-[20px] items-center justify-center rounded-md bg-emerald-200 text-emerald-800">
        <IconSearch size={14} />
      </div>
    ) : search.key ? (
      <div className="flex h-[20px] w-[20px] items-center justify-center rounded-md bg-zinc-100 text-zinc-600">
        <IconSearch size={14} />
      </div>
    ) : selectedKey ? (
      <TabTypeIcon selectedKey={selectedKey} />
    ) : undefined

  const tabNode = (
    <div
      id={isList ? `list-tab-${id}` : `tab-${id}`}
      onClick={() => selectTab(id)}
      className={cn(
        "flex h-[40px] w-full cursor-pointer items-center gap-2 rounded-t-lg px-3 text-[13px] transition-colors",
        isList && "max-w-[370px]",
        !isList &&
          (active ? "bg-white text-zinc-950" : "bg-zinc-200 text-zinc-600 hover:bg-zinc-100")
      )}
    >
      <div className={cn(!active && "transition-colors")}>{iconNode}</div>
      <span
        ref={ref}
        className={cn("min-w-0 grow truncate whitespace-nowrap", !isList && "max-w-32")}
      >
        {label || "New Tab"}
      </span>

      {/* Show pin icon on the right if pinned */}
      {pinned && <IconPin size={14} className="text-zinc-500" />}

      {/* Only show close button if there's more than one tab and tab is not pinned */}
      {tabs.length > 1 && !pinned && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeTab(id)
          }}
          className="p-[2px] text-zinc-400 transition-colors hover:text-zinc-500"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  )

  return (
    <ContextMenu>
      <SimpleTooltip content={isOverflow ? label : undefined}>
        <ContextMenuTrigger asChild>{tabNode}</ContextMenuTrigger>
      </SimpleTooltip>
      <ContextMenuContent
        onClick={(e) => {
          e.stopPropagation()
        }}
      >
        <ContextMenuItem onSelect={() => togglePinTab(id)} className="gap-2">
          <IconPin size={16} />
          {pinned ? "Unpin Tab" : "Pin Tab"}
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => duplicateTab(id)} className="gap-2">
          <IconCopyPlus size={16} />
          Duplicate Tab
        </ContextMenuItem>
        <ContextMenuSeparator />
        <ContextMenuItem onSelect={() => forceRemoveTab(id)} className="gap-2">
          <IconX size={16} />
          Close Tab
        </ContextMenuItem>
        <ContextMenuItem onSelect={() => closeOtherTabs(id)} className="gap-2">
          <IconSquareX size={16} />
          Close Other Tabs
        </ContextMenuItem>
        <ContextMenuItem
          onSelect={() => closeAllButPinned()}
          className="gap-2"
          disabled={!hasPinnedTabs}
        >
          <IconArrowsMinimize size={16} />
          Close All But Pinned
        </ContextMenuItem>
      </ContextMenuContent>
    </ContextMenu>
  )
}
