import type { DataType } from "@/types"

import { Spinner } from "@/components/ui/spinner"

import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { DisplayHeader } from "./display-header"

export const SearchDisplay = ({ dataKey, type }: { dataKey: string; type: DataType }) => {
  const { data, isLoading } = useFetchSearchIndex(dataKey)

  const content = data ? JSON.stringify(data, null, 2) : undefined

  return (
    <div className="flex h-full w-full flex-col gap-2">
      <DisplayHeader dataKey={dataKey} type={type} content={content} />

      <div className="flex h-full grow flex-col gap-2 rounded-md bg-zinc-100">
        {isLoading ? (
          <Spinner isLoadingText={""} isLoading={true} />
        ) : data === null || data === undefined ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-zinc-500">No data found</span>
          </div>
        ) : (
          <div className="grow rounded-md border border-zinc-300 bg-white p-2 overflow-auto">
            <pre className="text-sm font-mono whitespace-pre-wrap break-words">
              {JSON.stringify(data, null, 2)}
            </pre>
          </div>
        )}
      </div>
    </div>
  )
}
