import { useTab } from "@/tab-provider"
import { type DataType, type ListDataType } from "@/types"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { ScrollArea } from "@/components/ui/scroll-area"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { TypeTag } from "../type-tag"
import { HeaderTTLBadge, LengthBadge, SizeBadge } from "./header-badges"
import { ItemActions } from "./item-actions"
import { KeyActions } from "./key-actions"

export const DisplayHeader = ({
  dataKey,
  type,
  content,
  hideTypeTag,
}: {
  content?: string
  dataKey: string
  type: DataType
  hideTypeTag?: boolean
}) => {
  const { setSelectedListItem, selectedListItem } = useTab()

  const isListType = type !== "string" && type !== "json" && type !== "search" && type !== "stream"
  const showItemActions = isListType && Boolean(selectedListItem)

  const handleAddItem = () => {
    setSelectedListItem({ key: type === "stream" ? "*" : "", isNew: true })
  }

  return (
    <div className="rounded-lg">
      {/* Key title and actions */}
      <div className="flex h-[26px] items-center justify-between gap-4">
        <h2 className="grow truncate text-sm">
          {dataKey.trim() === "" ? (
            <span className="ml-1 text-zinc-500">(Empty Key)</span>
          ) : (
            <span className="font-medium text-zinc-950">{dataKey}</span>
          )}
        </h2>

        <div className="flex items-center gap-1">
          {type !== "string" && type !== "json" && type !== "search" && !showItemActions && (
            <SimpleTooltip content="Add item">
              <Button onClick={handleAddItem} size="icon-sm" aria-label="Add item">
                <IconPlus className="size-4 text-zinc-500 dark:text-zinc-600" />
              </Button>
            </SimpleTooltip>
          )}

          {showItemActions ? (
            <ItemActions dataKey={dataKey} type={type as ListDataType} />
          ) : selectedListItem ? undefined : (
            <KeyActions dataKey={dataKey} content={content} type={type} />
          )}
        </div>
      </div>

      {/* Key info badges */}
      {type === "search" && hideTypeTag ? undefined : (
        <ScrollArea orientation="horizontal" className="w-full whitespace-nowrap">
          <div className="flex w-max items-center gap-1.5 pb-2 pt-1">
            {!hideTypeTag && <TypeTag variant={type} type="badge" />}
            {type !== "search" && <SizeBadge dataKey={dataKey} />}
            {type !== "search" && <LengthBadge dataKey={dataKey} type={type} content={content} />}
            {type !== "search" && <HeaderTTLBadge dataKey={dataKey} />}
          </div>
        </ScrollArea>
      )}
    </div>
  )
}
