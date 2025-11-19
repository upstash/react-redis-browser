import {
  IconArrowsMinimize,
  IconCopyPlus,
  IconPin,
  IconSearch,
  IconSquareX,
  IconX,
} from "@tabler/icons-react"
import { SimpleTooltip } from "@/components/ui/tooltip"
import {
  ContextMenu,
  ContextMenuContent,
  ContextMenuItem,
  ContextMenuSeparator,
  ContextMenuTrigger,
} from "@/components/ui/context-menu"
import { cn } from "@/lib/utils"
import type { TabId } from "@/store"
import { useDatabrowserStore } from "@/store"
import { TabTypeIcon } from "./tab-type-icon"
import { useTab } from "@/tab-provider"
import { useOverflow } from "@/hooks/use-overflow"

export const Tab = ({ id, isList }: { id: TabId; isList?: boolean }) => {
  const { active, search, selectedKey, pinned } = useTab()
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

  const label = search.key || selectedKey
  const iconNode = search.key ? (
    <IconSearch size={15} />
  ) : selectedKey ? (
    <TabTypeIcon selectedKey={selectedKey} />
  ) : undefined

  const tabNode = (
    <div
      id={isList ? `list-tab-${id}` : `tab-${id}`}
      onClick={() => selectTab(id)}
      className={cn(
        "flex h-9 w-full cursor-pointer items-center gap-2 px-3 text-[13px] transition-colors",
        isList && "max-w-[370px]",
        !isList && "rounded-t-lg border border-zinc-200",
        !isList &&
          (active ? "border-b-white bg-white text-zinc-900" : "bg-zinc-100 hover:bg-zinc-50")
      )}
    >
      {iconNode}
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
          className="p-1 text-zinc-300 transition-colors hover:text-zinc-500 dark:text-zinc-400"
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
