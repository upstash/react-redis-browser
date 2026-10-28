import { useTab } from "@/tab-provider"
import { DATA_TYPE_NAMES } from "@/types"
import { IconArrowLeft, IconFolderOpen } from "@tabler/icons-react"

import { getParentFolder } from "@/lib/folders"
import { fromKeySearchPattern } from "@/lib/utils"
import { Button } from "@/components/ui/button"

import { useKeys } from "../../hooks/use-keys"

export const Empty = () => {
  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border bg-white px-4 py-6 text-center">
      <div className="space-y-5">
        <p className="text-md font-medium">Data on a break</p>
        <p className="text-balance text-center">"Quick, lure it back with some CLI magic!"</p>
      </div>
    </div>
  )
}

/** Empty state of an open folder, or of a search inside one */
export const FolderEmpty = () => {
  const { folderView } = useKeys()
  const { search, setSearchKey, setSearchType, setFolder } = useTab()
  const { folder, delimiter } = folderView

  const parent = getParentFolder(folder, delimiter)
  const isSearch = search.key !== ""
  // Plain-text searches unescaped with their trailing "*", user globs as written
  const searchText = fromKeySearchPattern(search.key)
  const searchLabel = searchText === search.key ? search.key : `${searchText}*`
  const typeName = search.type ? DATA_TYPE_NAMES[search.type] : undefined

  return (
    <div className="flex h-full w-full items-center justify-center rounded-md border bg-white px-4 py-6 text-center">
      <div className="flex flex-col items-center gap-3">
        <span className="flex size-10 items-center justify-center rounded-full bg-zinc-100 text-zinc-500">
          <IconFolderOpen size={20} />
        </span>
        <div className="space-y-1">
          <p className="text-md font-medium">
            {isSearch
              ? "No matching keys"
              : typeName
                ? `No ${typeName} keys ${folder ? "in this folder" : "here"}`
                : "This folder is empty"}
          </p>
          <p className="text-balance text-sm text-zinc-500">
            {isSearch ? (
              <>
                Nothing matches <code className="text-zinc-700">{searchLabel}</code>
                {folder ? " in this folder" : ""}.
              </>
            ) : typeName ? (
              "Pick another type or clear the filter."
            ) : (
              <>
                No keys start with <code className="text-zinc-700">{folder}</code> anymore.
              </>
            )}
          </p>
        </div>
        {isSearch ? (
          <Button size="default" onClick={() => setSearchKey("")}>
            Clear search
          </Button>
        ) : typeName ? (
          <Button size="default" onClick={() => setSearchType(undefined)}>
            Clear filter
          </Button>
        ) : (
          <Button size="default" className="gap-1.5" onClick={() => setFolder(parent)}>
            <IconArrowLeft size={16} />
            {parent ? "Up one folder" : "All keys"}
          </Button>
        )}
      </div>
    </div>
  )
}
