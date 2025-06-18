import { IconPlus } from "@tabler/icons-react"
import { Button } from "@/components/ui/button"
import type { TabId } from "@/store"
import { useDatabrowserStore } from "@/store"
import { TabIdProvider } from "@/tab-provider"
import { Tab } from "./tab"

export const DatabrowserTabs = () => {
  const { tabs, addTab } = useDatabrowserStore()

  return (
    <div className="relative mb-2 shrink-0">
      <div className="absolute bottom-0 left-0 right-0 -z-10 h-[1px] w-full bg-zinc-200" />

      <div className="scrollbar-hide flex translate-y-[1px] items-center gap-1 overflow-x-scroll pb-[1px] [&::-webkit-scrollbar]:hidden">
        {tabs.map(([id]) => (
          <TabIdProvider key={id} value={id as TabId}>
            <Tab id={id} />
          </TabIdProvider>
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
