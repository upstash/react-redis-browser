import { IconPlus, IconX } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import type { TabId } from "@/store"
import { useDatabrowserStore } from "@/store"
import { TabTypeIcon } from "./tab-type-icon"

const Tab = ({ id }: { id: TabId }) => {
  const { selectTab, selectedTab, tabs, removeTab } = useDatabrowserStore()

  return (
    <div
      onClick={() => selectTab(id)}
      className={cn(
        "flex h-9 cursor-pointer items-center gap-2 rounded-t-lg border border-zinc-200 px-3 text-[13px] transition-colors",
        id === selectedTab
          ? "border-b-white bg-white text-zinc-900"
          : "bg-zinc-100 hover:bg-zinc-50"
      )}
    >
      {tabs[id].selectedKey ? (
        <>
          <TabTypeIcon selectedKey={tabs[id].selectedKey} />
          <span className="max-w-32 truncate whitespace-nowrap">{tabs[id].selectedKey}</span>
        </>
      ) : (
        <span className="whitespace-nowrap">New Tab</span>
      )}
      {/* Only show close button if there's more than one tab */}
      {Object.keys(tabs).length > 1 && (
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
}

export const DatabrowserTabs = () => {
  const { tabs, addTab } = useDatabrowserStore()

  return (
    <div className="relative mb-2 shrink-0">
      <div className="absolute bottom-0 left-0 right-0 -z-10 h-[1px] w-full bg-zinc-200" />

      <div className="scrollbar-hide flex translate-y-[1px] items-center gap-1 overflow-x-scroll pb-[1px] [&::-webkit-scrollbar]:hidden">
        {Object.keys(tabs).map((id) => (
          <Tab id={id as TabId} key={id} />
        ))}
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
