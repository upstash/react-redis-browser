import { Fragment, useRef } from "react"
import { useTab } from "@/tab-provider"
import type { RedisKey } from "@/types"
import { IconChevronRight } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
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
          <Fragment key={data[0]}>
            <KeyItem
              index={i}
              data={data}
              allKeys={keys}
              lastClickedIndexRef={lastClickedIndexRef}
            />
            {i !== keys.length - 1 && (
              <div className="-z-10 mx-[13px] h-px bg-zinc-200 dark:bg-zinc-200" />
            )}
          </Fragment>
        ))}
      </>
    </SidebarContextMenu>
  )
}

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
    <button
      data-key={dataKey}
      className={cn(
        "relative flex h-10 w-full items-center justify-start gap-2 rounded-lg px-3 py-0 !ring-0 transition-colors focus-visible:bg-zinc-50",
        "-my-px select-none border border-transparent text-left",
        isKeySelected
          ? "border-zinc-300 bg-white font-medium text-zinc-950 shadow-[0_1px_2px_0_rgba(0,0,0,0.10)]"
          : "shadow-none hover:bg-zinc-200"
      )}
      onClick={handleClick}
    >
      <TypeTag variant={dataType} type="icon" />
      <p className="grow truncate whitespace-nowrap">{dataKey}</p>
      {isKeySelected && <IconChevronRight className="shrink-0 text-zinc-500" size={20} />}
    </button>
  )
}
