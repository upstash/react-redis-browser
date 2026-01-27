import { useMemo } from "react"
import { useTab } from "@/tab-provider"
import type { ListDataType } from "@/types"
import { IconTrash } from "@tabler/icons-react"
import type { InfiniteData, UseInfiniteQueryResult } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { InfiniteScroll } from "../../../common/infinite-scroll"
import { useEditListItem } from "../../hooks"
import { useFetchListItems } from "../../hooks/use-fetch-list-items"
import { DeleteKeyModal } from "../delete-key-modal"
import { ItemContextMenu } from "../item-context-menu"
import { DisplayHeader } from "./display-header"
import { ListEditDisplay } from "./display-list-edit"
import { HashFieldTTLInfo } from "./hash/hash-field-ttl-info"

export const headerLabels = {
  list: ["Index", "Content"],
  hash: ["Field", "Value"],
  zset: ["Value", "Score"],
  stream: ["ID", "Value"],
  set: ["Value", ""],
} as const

export const ListDisplay = ({ dataKey, type }: { dataKey: string; type: ListDataType }) => {
  const { selectedListItem } = useTab()
  const query = useFetchListItems({ dataKey, type })

  return (
    <div className="flex h-full flex-col gap-2">
      <DisplayHeader dataKey={dataKey} type={type} />

      {selectedListItem && (
        <ListEditDisplay dataKey={dataKey} type={type} item={selectedListItem} />
      )}

      <div className={cn("min-h-0 grow", selectedListItem && "hidden")}>
        <InfiniteScroll query={query} className="rounded-lg border border-zinc-200 bg-white">
          <table className="w-full">
            <ItemContextMenu dataKey={dataKey} type={type}>
              <tbody>
                <ListItems dataKey={dataKey} type={type} query={query} />
              </tbody>
            </ItemContextMenu>
          </table>
        </InfiniteScroll>
      </div>
    </div>
  )
}

export type ItemData = {
  key: string
  value?: string
}

export const ListItems = ({
  query,
  type,
  dataKey,
}: {
  query: UseInfiniteQueryResult<
    InfiniteData<{
      keys: ItemData[]
    }>
  >
  type: ListDataType
  dataKey: string
}) => {
  const { setSelectedListItem } = useTab()
  const keys = useMemo(() => query.data?.pages.flatMap((page) => page.keys) ?? [], [query.data])
  const fields = useMemo(() => keys.map((key) => key.key), [keys])
  const { mutate: editItem } = useEditListItem()

  return (
    <>
      {keys.map(({ key, value }, i) => (
        <tr
          key={`${dataKey}-${key}-${i}`}
          data-item-key={key}
          data-item-value={value}
          onClick={() => {
            setSelectedListItem({ key })
          }}
          className={cn(
            "h-9 border-b border-b-zinc-100 transition-colors hover:bg-zinc-100 dark:border-b-zinc-200 dark:hover:bg-zinc-200"
          )}
        >
          <td
            className={cn(
              "cursor-pointer truncate px-3",
              type === "list" || type === "stream" ? "w-32 min-w-24" : "max-w-0"
            )}
          >
            {key}
          </td>
          {value !== undefined && (
            <td
              className={cn("cursor-pointer truncate px-3", type === "zset" ? "w-24" : "max-w-0")}
            >
              {value}
            </td>
          )}
          {type !== "stream" && (
            <td
              className="w-0 min-w-0 p-0 pr-2"
              onClick={(e) => {
                e.stopPropagation()
              }}
            >
              <div className="flex items-center justify-end gap-2">
                {type === "hash" && (
                  <HashFieldTTLInfo dataKey={dataKey} field={key} fields={fields} />
                )}
                <DeleteKeyModal
                  deletionType="item"
                  onDeleteConfirm={(e) => {
                    e.stopPropagation()
                    editItem({
                      type,
                      dataKey,
                      itemKey: key,
                      // For deletion
                      newKey: undefined,
                    })
                  }}
                >
                  <Button
                    className=""
                    size="icon-sm"
                    variant="secondary"
                    onClick={(e) => e.stopPropagation()}
                  >
                    <IconTrash className="size-4 text-zinc-500" />
                  </Button>
                </DeleteKeyModal>
              </div>
            </td>
          )}
        </tr>
      ))}
    </>
  )
}
