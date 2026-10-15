import { useState } from "react"
import { useDatabrowserStore, type KeyListView } from "@/store"
import { useTab } from "@/tab-provider"
import { IconCheck, IconChevronDown, IconFolder, IconList } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { useKeys } from "../../../../hooks/use-keys"

const options: {
  view: KeyListView
  label: string
  title: string
  description: string
  icon: React.ReactNode
}[] = [
  {
    view: "folders",
    label: "Folder view",
    title: "Folders",
    description: "Group keys at the delimiter",
    icon: <IconFolder size={16} />,
  },
  {
    view: "flat",
    label: "Flat view",
    title: "Flat list",
    description: "Every key by its full name",
    icon: <IconList size={16} />,
  },
]

const PRESET_DELIMITERS = [":", "/", ".", "|"]

/**
 * One "View" button at the end of the list bar. Its popover holds every setting for how the
 * list is shown: folders or a flat list, and the delimiter that splits keys into folders.
 */
export const ListViewMenu = () => {
  const { keyListView, folderDelimiter } = useDatabrowserStore()
  const [open, setOpen] = useState(false)
  const isFolders = keyListView === "folders"

  return (
    <Popover open={open} onOpenChange={setOpen}>
      <SimpleTooltip content={open ? undefined : "View options"}>
        <PopoverTrigger asChild>
          <button
            aria-label="View options"
            className={cn(
              "browser-view-menu flex h-6 shrink-0 items-center gap-1 rounded-md border border-zinc-300 bg-white pl-1.5 pr-1 text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900",
              open && "bg-zinc-50 text-zinc-900"
            )}
          >
            {isFolders ? <IconFolder size={14} /> : <IconList size={14} />}
            {isFolders && (
              <span className="min-w-[1ch] font-mono text-xs leading-none">{folderDelimiter}</span>
            )}
            <IconChevronDown size={12} className="text-zinc-400" />
          </button>
        </PopoverTrigger>
      </SimpleTooltip>
      <PopoverContent align="end" className="w-64 p-1.5">
        <ViewOptions />
      </PopoverContent>
    </Popover>
  )
}

const ViewOptions = () => {
  const { keyListView, setKeyListView } = useDatabrowserStore()

  return (
    <div className="flex flex-col">
      <p className="px-2 pb-1 pt-1 text-xs font-medium text-zinc-500">Show keys as</p>
      <div role="radiogroup" aria-label="Key list view" className="flex flex-col gap-px">
        {options.map(({ view, label, title, description, icon }) => {
          const checked = keyListView === view
          return (
            <button
              key={view}
              role="radio"
              aria-checked={checked}
              aria-label={label}
              onClick={() => setKeyListView(view)}
              className={cn(
                "flex items-center gap-2.5 rounded-md px-2 py-1.5 text-left transition-colors hover:bg-zinc-100",
                checked && "bg-zinc-100"
              )}
            >
              <span
                className={cn(
                  "flex size-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white text-zinc-500",
                  checked && "border-zinc-300 text-zinc-900"
                )}
              >
                {icon}
              </span>
              <span className="min-w-0 grow">
                <span className="block text-sm font-medium text-zinc-900">{title}</span>
                <span className="block truncate text-xs text-zinc-500">{description}</span>
              </span>
              <IconCheck
                size={16}
                className={cn("shrink-0 text-emerald-600", !checked && "invisible")}
              />
            </button>
          )
        })}
      </div>
      {keyListView === "folders" && <DelimiterOptions />}
    </div>
  )
}

const DelimiterOptions = () => {
  const { folderDelimiter, setFolderDelimiter } = useDatabrowserStore()
  const isPreset = PRESET_DELIMITERS.includes(folderDelimiter)
  const [custom, setCustom] = useState(isPreset ? "" : folderDelimiter)

  const apply = (value: string) => {
    if (value && value !== folderDelimiter) setFolderDelimiter(value)
  }

  return (
    <div className="mt-1.5 border-t border-zinc-100 px-2 pb-1.5 pt-2.5">
      <label htmlFor="folder-delimiter" className="text-xs font-medium text-zinc-500">
        Folder delimiter
      </label>
      <form
        className="mt-1.5 flex items-center gap-1"
        onSubmit={(e) => {
          e.preventDefault()
          apply(custom)
        }}
      >
        {PRESET_DELIMITERS.map((delimiter) => (
          <button
            key={delimiter}
            type="button"
            aria-pressed={folderDelimiter === delimiter}
            aria-label={`Split at ${delimiter}`}
            onClick={() => {
              setCustom("")
              apply(delimiter)
            }}
            className={cn(
              "flex size-7 shrink-0 items-center justify-center rounded-md border border-zinc-200 bg-white font-mono text-sm text-zinc-600 transition-colors hover:bg-zinc-50 hover:text-zinc-900",
              folderDelimiter === delimiter &&
                "border-emerald-600 bg-emerald-50 text-emerald-800 hover:bg-emerald-50"
            )}
          >
            {delimiter}
          </button>
        ))}
        <Input
          id="folder-delimiter"
          placeholder="Other"
          value={custom}
          maxLength={8}
          onChange={(e) => setCustom(e.target.value)}
          onBlur={() => apply(custom)}
          className={cn(
            "h-7 min-w-0 grow px-2 font-mono text-sm placeholder:font-sans",
            !isPreset && "border-emerald-600 bg-emerald-50"
          )}
        />
      </form>
      <p className="mt-2 text-xs text-zinc-500">
        Splits <code className="text-zinc-700">user{folderDelimiter}1</code> into folders.
      </p>
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
      <span className="min-w-0 grow truncate font-medium text-zinc-900">
        {filtered ? "Matching keys" : "All keys"}
      </span>
      <ListViewMenu />
    </div>
  )
}
