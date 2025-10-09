/* eslint-disable unicorn/no-negated-condition */

import { useKeys, useKeyType } from "../../hooks/use-keys"
import { ListDisplay } from "./display-list"
import { EditorDisplay } from "./display-simple"
import { useTab } from "@/tab-provider"

export const DataDisplay = () => {
  const { selectedKey } = useTab()

  const { query } = useKeys()
  const type = useKeyType(selectedKey)

  return (
    <div className="h-full p-4">
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
