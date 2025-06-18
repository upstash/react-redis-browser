import { IconSearch, IconX } from "@tabler/icons-react"
import { SimpleTooltip } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { TabId } from "@/store"
import { useDatabrowserStore } from "@/store"
import { TabTypeIcon } from "./tab-type-icon"
import { useTab } from "@/tab-provider"
import { useOverflow } from "@/hooks/use-overflow"

export const Tab = ({ id }: { id: TabId }) => {
  const { active, search, selectedKey } = useTab()
  const { selectTab, removeTab, tabs } = useDatabrowserStore()

  const { ref, isOverflow } = useOverflow()

  const label = search.key || selectedKey
  const iconNode = search.key ? (
    <IconSearch size={15} />
  ) : selectedKey ? (
    <TabTypeIcon selectedKey={selectedKey} />
  ) : undefined

  const tabNode = (
    <div
      onClick={() => selectTab(id)}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-t-lg border border-zinc-200 px-3 text-[13px] transition-colors",
        active ? "border-b-white bg-white text-zinc-900" : "bg-zinc-100 hover:bg-zinc-50"
      )}
    >
      {iconNode}
      <span ref={ref} className="max-w-32 truncate whitespace-nowrap">
        {label || "New Tab"}
      </span>

      {/* Only show close button if there's more than one tab */}
      {tabs.length > 1 && (
        <button
          onClick={(e) => {
            e.stopPropagation()
            removeTab(id)
          }}
          className="p-1 text-zinc-300 transition-colors hover:text-zinc-500"
        >
          <IconX size={16} />
        </button>
      )}
    </div>
  )

  return <SimpleTooltip content={isOverflow ? label : undefined}>{tabNode}</SimpleTooltip>
}
