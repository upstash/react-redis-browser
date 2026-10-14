import { useDatabrowserStore, type KeyListView } from "@/store"
import { useTab } from "@/tab-provider"
import { IconFolder, IconList } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { useKeys } from "../../hooks/use-keys"

const options: { view: KeyListView; label: string; icon: React.ReactNode }[] = [
  { view: "folders", label: "Folder view", icon: <IconFolder size={16} /> },
  { view: "flat", label: "Flat view", icon: <IconList size={16} /> },
]

/** Switches the key list between folders and a flat list, on servers that support folders */
export const ViewToggle = () => {
  const { folderView } = useKeys()
  const { search } = useTab()
  const { keyListView, setKeyListView } = useDatabrowserStore()

  if (folderView.supported !== true || search.type === "search") return null

  return (
    <div
      role="radiogroup"
      aria-label="Key list view"
      className="browser-view-toggle flex h-8 shrink-0 items-center gap-0.5 rounded-lg border border-zinc-300 bg-white p-0.5 shadow-[0_1px_1px_0_rgba(0,0,0,0.10)]"
    >
      {options.map(({ view, label, icon }) => (
        <SimpleTooltip key={view} content={label}>
          <button
            role="radio"
            aria-checked={keyListView === view}
            aria-label={label}
            onClick={() => setKeyListView(view)}
            className={cn(
              "flex h-full w-7 items-center justify-center rounded-md text-zinc-500 transition-colors hover:text-zinc-900",
              keyListView === view && "bg-zinc-100 text-zinc-900 dark:bg-zinc-200"
            )}
          >
            {icon}
          </button>
        </SimpleTooltip>
      ))}
    </div>
  )
}
