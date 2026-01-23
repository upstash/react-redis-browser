/* eslint-disable unicorn/no-negated-condition */

import { useTab } from "@/tab-provider"
import { DATA_TYPES, SIMPLE_DATA_TYPES, type SimpleDataType } from "@/types"

import { useKeys, useKeyType } from "../../hooks/use-keys"
import { ListDisplay } from "./display-list"
import { SearchDisplay } from "./display-search"
import { EditorDisplay } from "./display-simple"

export const DataDisplay = () => {
  const { selectedKey } = useTab()

  const { query } = useKeys()
  const type = useKeyType(selectedKey)

  return (
    <div className="h-full rounded-xl bg-zinc-100 p-5">
      {!selectedKey ? (
        <div />
      ) : !type ? (
        query.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-zinc-500">Loading...</span>
          </div>
        ) : (
          <div />
        )
      ) : !DATA_TYPES.includes(type as any) ? (
        <div className="flex h-full items-center justify-center">
          <span className="text-zinc-500">Unrecognized key type: {type}</span>
        </div>
      ) : (
        <>
          {SIMPLE_DATA_TYPES.includes(type as SimpleDataType) ? (
            <EditorDisplay dataKey={selectedKey} type={type as SimpleDataType} />
          ) : type === "search" ? (
            <SearchDisplay dataKey={selectedKey} type={type} />
          ) : (
            <ListDisplay dataKey={selectedKey} type={type as any} />
          )}
        </>
      )}
    </div>
  )
}
