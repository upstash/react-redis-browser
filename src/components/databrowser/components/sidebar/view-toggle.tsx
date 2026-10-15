import { useDatabrowserStore, type KeyListView } from "@/store"
import { useTab } from "@/tab-provider"
import { IconFolder, IconList } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { useKeys } from "../../hooks/use-keys"

const options: { view: KeyListView; label: string; icon: React.ReactNode }[] = [
  { view: "folders", label: "Folder view", icon: <IconFolder size={14} /> },
  { view: "flat", label: "Flat view", icon: <IconList size={14} /> },
]

/** Switches the key list between folders and a flat list, in the bar above the list */
export const ViewToggle = () => {
  const { keyListView, setKeyListView } = useDatabrowserStore()

  return (
    <div
      role="radiogroup"
      aria-label="Key list view"
      className="browser-view-toggle flex h-6 shrink-0 items-center gap-px rounded-md border border-zinc-300 bg-white p-px"
    >
      {options.map(({ view, label, icon }) => (
        <SimpleTooltip key={view} content={label}>
          <button
            role="radio"
            aria-checked={keyListView === view}
            aria-label={label}
            onClick={() => setKeyListView(view)}
            className={cn(
              "flex h-full w-6 items-center justify-center rounded-[5px] text-zinc-500 transition-colors hover:text-zinc-900",
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

/** Whether the list can switch views: the server supports folders and the list holds keys */
export const useShowViewToggle = () => {
  const { folderView } = useKeys()
  const { search, isValuesSearchSelected } = useTab()
  return folderView.supported === true && search.type !== "search" && !isValuesSearchSelected
}

/** The bar above the flat list, so the view can be switched back to folders */
export const FlatListBar = () => {
  const { search } = useTab()
  const filtered = search.key !== "" || search.type !== undefined

  return (
    <div className="browser-flat-bar flex h-9 shrink-0 items-center gap-1.5 rounded-xl bg-zinc-100 pl-3 pr-1.5 text-[13px] dark:bg-zinc-200">
      <IconList size={14} className="shrink-0 text-zinc-500" />
      <span className="min-w-0 grow truncate font-medium text-zinc-900">
        {filtered ? "Matching keys" : "All keys"}
      </span>
      <ViewToggle />
    </div>
  )
}
