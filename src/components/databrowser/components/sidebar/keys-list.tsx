import { Fragment, useRef } from "react"
import { useTab } from "@/tab-provider"
import type { RedisKey } from "@/types"
import { IconChevronRight, IconFolderFilled } from "@tabler/icons-react"

import { formatFolderCount, getEntryLabel, type KeyListEntry } from "@/lib/folders"
import { cn } from "@/lib/utils"
import { TypeTag } from "@/components/databrowser/components/type-tag"

import { useKeys, type FolderView } from "../../hooks/use-keys"
import { SidebarContextMenu } from "../sidebar-context-menu"

export const KeysList = () => {
  const { keys, entries, folderView } = useKeys()
  // Anchor for shift-click ranges, kept as a key since indexes shift when keys are added or deleted
  const lastClickedKeyRef = useRef<string>()

  // Index of each key among the keys only, for shift click range selection
  let keyIndex = -1

  return (
    <SidebarContextMenu>
      <>
        {/* Since the selection border is overflowing, we need a px padding for the first item */}
        <div className="h-px" />
        {entries.map((entry, i) => (
          <Fragment key={`${entry.kind}:${entry.key}`}>
            {entry.kind === "folder" ? (
              <FolderItem entry={entry} folderView={folderView} />
            ) : (
              <KeyItem
                index={++keyIndex}
                data={[entry.key, entry.type, entry.score]}
                label={
                  folderView.enabled
                    ? getEntryLabel(entry, folderView.folder, folderView.delimiter)
                    : undefined
                }
                allKeys={keys}
                lastClickedKeyRef={lastClickedKeyRef}
              />
            )}
            {i !== entries.length - 1 && (
              <div className="-z-10 mx-[13px] h-px bg-zinc-200 dark:bg-zinc-300" />
            )}
          </Fragment>
        ))}
      </>
    </SidebarContextMenu>
  )
}

const FolderItem = ({
  entry,
  folderView,
}: {
  entry: Extract<KeyListEntry, { kind: "folder" }>
  folderView: FolderView
}) => {
  const { setFolder } = useTab()
  const { path, name } = getEntryLabel(entry, folderView.folder, folderView.delimiter)
  const count = formatFolderCount(entry.count)

  return (
    <button
      data-folder={entry.key}
      title={entry.key}
      className={cn(
        "browser-folder-row group relative flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 py-0 !ring-0 transition-colors",
        "-my-px select-none border border-transparent text-left hover:bg-zinc-200/70 focus-visible:bg-zinc-50 dark:hover:bg-zinc-300/50"
      )}
      onClick={() => setFolder(entry.key)}
    >
      <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-700">
        <IconFolderFilled size={13} />
      </span>
      <p className="min-w-0 grow truncate whitespace-nowrap">
        {path && <span className="text-zinc-400">{path}</span>}
        {name || <span className="italic text-zinc-500">(empty)</span>}
      </p>
      <span
        className="shrink-0 rounded-full bg-zinc-200 px-1.5 py-px text-xs font-medium tabular-nums text-zinc-600 dark:bg-zinc-300"
        aria-label={`${count} keys`}
      >
        {count}
      </span>
      <IconChevronRight
        className="-mr-1 shrink-0 text-zinc-400 transition-transform group-hover:translate-x-0.5"
        size={16}
      />
    </button>
  )
}

const keyStyles: Record<string, string> = {
  string: "border-sky-400 !bg-sky-50 text-sky-900",
  hash: "border-amber-400 !bg-amber-50 text-amber-900",
  set: "border-indigo-400 !bg-indigo-50 text-indigo-900",
  zset: "border-pink-400  !bg-pink-50 text-pink-900",
  json: "border-purple-400 !bg-purple-50 text-purple-900",
  list: "border-orange-400 !bg-orange-50 text-orange-900",
  stream: "border-green-400 !bg-green-50 text-green-900",
  search: "border-rose-400 !bg-rose-50 text-rose-900",
}

const defaultKeyStyle = "border-gray-400 !bg-gray-50 text-gray-900"

const KeyItem = ({
  data,
  index,
  label,
  allKeys,
  lastClickedKeyRef,
}: {
  data: RedisKey
  index: number
  // The name relative to the open folder in the folder view
  label?: { path: string; name: string }
  allKeys: RedisKey[]
  lastClickedKeyRef: React.MutableRefObject<string | undefined>
}) => {
  const { selectedKeys, setSelectedKeys, setSelectedKey } = useTab()

  const [dataKey, dataType, score] = data
  const isKeySelected = selectedKeys.includes(dataKey)

  const handleClick = (e: React.MouseEvent) => {
    const anchorIndex = e.shiftKey
      ? allKeys.findIndex(([key]) => key === lastClickedKeyRef.current)
      : -1

    if (anchorIndex !== -1) {
      // Shift+Click: select range
      const start = Math.min(anchorIndex, index)
      const end = Math.max(anchorIndex, index)
      const rangeKeys = allKeys.slice(start, end + 1).map(([key]) => key)
      setSelectedKeys(rangeKeys)
    } else if (e.metaKey || e.ctrlKey) {
      // cmd/ctrl+click to toggle selection
      if (isKeySelected) {
        setSelectedKeys(selectedKeys.filter((k) => k !== dataKey))
      } else {
        setSelectedKeys([...selectedKeys, dataKey])
      }
      lastClickedKeyRef.current = dataKey
    } else {
      // Regular click: select single key
      setSelectedKey(dataKey)
      lastClickedKeyRef.current = dataKey
    }
  }

  return (
    <button
      data-key={dataKey}
      title={label ? dataKey : undefined}
      className={cn(
        "browser-key-row relative flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 py-0 !ring-0 transition-colors focus-visible:bg-zinc-50",
        "-my-px select-none border border-transparent text-left",
        isKeySelected && "shadow-sm",
        isKeySelected && (keyStyles[dataType] ?? defaultKeyStyle)
      )}
      onClick={handleClick}
    >
      <TypeTag variant={dataType} type="icon" />
      <p className="min-w-0 grow truncate whitespace-nowrap">
        {label && (label.path || label.name) ? (
          <>
            {label.path && <span className="text-zinc-400">{label.path}</span>}
            {label.name}
          </>
        ) : (
          dataKey || "(Empty Key)"
        )}
      </p>
      {score !== undefined && (
        <span className="shrink-0 text-xs text-zinc-400">{score.toFixed(2)}</span>
      )}
      {isKeySelected && <IconChevronRight className="shrink-0 text-zinc-500" size={20} />}
    </button>
  )
}
