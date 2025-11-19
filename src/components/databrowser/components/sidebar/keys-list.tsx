import { useRef } from "react"
import { useTab } from "@/tab-provider"
import type { DataType, RedisKey } from "@/types"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { TypeTag } from "@/components/databrowser/components/type-tag"

import { useKeys } from "../../hooks/use-keys"
import { SidebarContextMenu } from "../sidebar-context-menu"

export const KeysList = () => {
  const { keys } = useKeys()
  const lastClickedIndexRef = useRef<number | null>(null)

  return (
    <SidebarContextMenu>
      <>
        {/* Since the selection border is overflowing, we need a px padding for the first item */}
        <div className="h-px" />
        {keys.map((data, i) => (
          <>
            <KeyItem
              key={data[0]}
              index={i}
              data={data}
              allKeys={keys}
              lastClickedIndexRef={lastClickedIndexRef}
            />
            {i !== keys.length - 1 && (
              <div className="-z-10 mx-2 h-px bg-zinc-100 dark:bg-zinc-200" />
            )}
          </>
        ))}
      </>
    </SidebarContextMenu>
  )
}

const keyStyles = {
  string: "border-sky-400 !bg-sky-50 text-sky-900",
  hash: "border-amber-400 !bg-amber-50 text-amber-900",
  set: "border-indigo-400 !bg-indigo-50 text-indigo-900",
  zset: "border-pink-400  !bg-pink-50 text-pink-900",
  json: "border-purple-400 !bg-purple-50 text-purple-900",
  list: "border-orange-400 !bg-orange-50 text-orange-900",
  stream: "border-green-400 !bg-green-50 text-green-900",
} as Record<DataType, string>

const KeyItem = ({
  data,
  index,
  allKeys,
  lastClickedIndexRef,
}: {
  data: RedisKey
  index: number
  allKeys: RedisKey[]
  lastClickedIndexRef: React.MutableRefObject<number | null>
}) => {
  const { selectedKeys, setSelectedKeys, setSelectedKey } = useTab()

  const [dataKey, dataType] = data
  const isKeySelected = selectedKeys.includes(dataKey)

  const handleClick = (e: React.MouseEvent) => {
    if (e.shiftKey && lastClickedIndexRef.current !== null) {
      // Shift+Click: select range
      const start = Math.min(lastClickedIndexRef.current, index)
      const end = Math.max(lastClickedIndexRef.current, index)
      const rangeKeys = allKeys.slice(start, end + 1).map(([key]) => key)
      setSelectedKeys(rangeKeys)
    } else if (e.metaKey || e.ctrlKey) {
      // cmd/ctrl+click to toggle selection
      if (isKeySelected) {
        setSelectedKeys(selectedKeys.filter((k) => k !== dataKey))
      } else {
        setSelectedKeys([...selectedKeys, dataKey])
      }
      lastClickedIndexRef.current = index
    } else {
      // Regular click: select single key
      setSelectedKey(dataKey)
      lastClickedIndexRef.current = index
    }
  }

  return (
    <Button
      data-key={dataKey}
      variant={isKeySelected ? "default" : "ghost"}
      className={cn(
        "relative flex h-10 w-full items-center justify-start gap-2 px-3 py-0 !ring-0 focus-visible:bg-zinc-50",
        "-my-px select-none border border-transparent text-left",
        isKeySelected && "shadow-sm",
        isKeySelected && keyStyles[dataType]
      )}
      onClick={handleClick}
    >
      <TypeTag variant={dataType} type="icon" />
      <p className="truncate whitespace-nowrap">{dataKey}</p>
    </Button>
  )
}
