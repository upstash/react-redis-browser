import { useDatabrowserStore, type KeyListView } from "@/store"
import { useTab } from "@/tab-provider"
import { IconFolder, IconList } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

import { useKeys } from "../../../../hooks/use-keys"
import { DelimiterSetting } from "./folder-breadcrumb"

const options: { view: KeyListView; label: string; title: string; icon: React.ReactNode }[] = [
  { view: "folders", label: "Folder view", title: "Folders", icon: <IconFolder size={15} /> },
  { view: "flat", label: "Flat view", title: "Flat", icon: <IconList size={15} /> },
]

/**
 * The strip above the key list: a labeled switch between folders and a flat list, and in
 * folder view the delimiter that splits keys into folders.
 */
export const ViewTabs = () => {
  const { keyListView, setKeyListView } = useDatabrowserStore()

  return (
    <div className="browser-view-tabs flex shrink-0 items-center justify-between gap-2">
      <div
        role="radiogroup"
        aria-label="Key list view"
        className="flex select-none gap-[2px] rounded-lg bg-zinc-200 p-[2px] text-[13px] dark:bg-zinc-300"
      >
        {options.map(({ view, label, title, icon }) => {
          const checked = keyListView === view
          return (
            <button
              key={view}
              role="radio"
              aria-checked={checked}
              aria-label={label}
              onClick={() => setKeyListView(view)}
              className={cn(
                "flex h-7 items-center gap-1.5 rounded-md pl-2 pr-2.5 text-zinc-600 transition-colors hover:text-zinc-900",
                checked && "bg-white font-medium text-zinc-950 shadow-sm"
              )}
            >
              {icon}
              {title}
            </button>
          )
        })}
      </div>
      {keyListView === "folders" && <DelimiterSetting />}
    </div>
  )
}

/** Whether the list can switch views: the server supports folders and the list holds keys */
export const useShowViewToggle = () => {
  const { folderView } = useKeys()
  const { search, isValuesSearchSelected } = useTab()
  return folderView.supported === true && search.type !== "search" && !isValuesSearchSelected
}
