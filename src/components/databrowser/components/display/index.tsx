/* eslint-disable unicorn/no-negated-condition */
import { useDatabrowserStore } from "@/store"

import { useKeys, useKeyType } from "../../hooks/use-keys"
import { ListDisplay } from "./display-list"
import { EditorDisplay } from "./display-simple"

export const DataDisplay = () => {
  const { selectedKey } = useDatabrowserStore()
  const { query } = useKeys()
  const type = useKeyType(selectedKey)

  return (
    <div className="h-full rounded-xl border bg-white p-1">
      {!selectedKey ? (
        <div />
      ) : !type ? (
        query.isLoading ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-gray-500">Loading...</span>
          </div>
        ) : (
          <div />
        )
      ) : (
        <>
          {type === "string" || type === "json" ? (
            <EditorDisplay dataKey={selectedKey} type={type} />
          ) : (
            <ListDisplay dataKey={selectedKey} type={type} />
          )}
        </>
      )}
    </div>
  )
}
