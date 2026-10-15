import { useDatabrowserStore, type KeyListView } from "@/store"
import { useTab } from "@/tab-provider"
import { IconFolder, IconList } from "@tabler/icons-react"

import { cn } from "@/lib/utils"

import { useKeys } from "../../../../hooks/use-keys"
import { DelimiterSetting } from "./folder-breadcrumb"

const options: { view: KeyListView; label: string; title: string; icon: React.ReactNode }[] = [
  { view: "folders", label: "Folder view", title: "Folders", icon: <IconFolder size={14} /> },
  { view: "flat", label: "Flat view", title: "Flat", icon: <IconList size={14} /> },
]

/** Whether the list can switch views: the server supports folders and the list holds keys */
export const useShowViewToggle = () => {
  const { folderView } = useKeys()
  const { search, isValuesSearchSelected } = useTab()
  return folderView.supported === true && search.type !== "search" && !isValuesSearchSelected
}

/**
 * The status bar below the key list, with the settings for how the list is shown: folders
 * or a flat list, and the delimiter that splits keys into folders.
 */
export const ListFooter = () => {
  const { keyListView, setKeyListView } = useDatabrowserStore()

  return (
    <div className="browser-list-footer flex h-9 shrink-0 items-center justify-between gap-2 rounded-xl bg-zinc-100 px-1.5 text-[13px] dark:bg-zinc-200">
      <div
        role="radiogroup"
        aria-label="Key list view"
        className="flex h-6 select-none items-center gap-0.5"
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
                "flex h-6 items-center gap-1.5 rounded-md px-2 text-zinc-500 transition-colors hover:bg-zinc-200 hover:text-zinc-900 dark:hover:bg-zinc-300",
                checked &&
                  "bg-white text-zinc-900 shadow-sm ring-1 ring-zinc-200 hover:bg-white dark:hover:bg-white"
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
