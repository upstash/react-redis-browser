import { useState } from "react"
import { useTab } from "@/tab-provider"
import type { DataType } from "@/types"
import { DialogDescription } from "@radix-ui/react-dialog"
import { IconPlus } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Dialog, DialogContent, DialogHeader, DialogTitle } from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Spinner } from "@/components/ui/spinner"
import { SimpleTooltip } from "@/components/ui/tooltip"
import { toast } from "@/components/ui/use-toast"
import { TypeTag } from "@/components/databrowser/components/type-tag"
import { useAddKey } from "@/components/databrowser/hooks/use-add-key"
import { useFetchSearchIndex } from "@/components/databrowser/hooks/use-fetch-search-index"

export function AddIndexKeyButton() {
  const { valuesSearch, setSelectedKey } = useTab()
  const indexName = valuesSearch.index

  const [open, setOpen] = useState(false)
  const [suffix, setSuffix] = useState("")
  const [error, setError] = useState<string>()

  const { data: indexDetails } = useFetchSearchIndex(indexName)
  const dataType = (indexDetails?.dataType ?? "string") as DataType
  const prefix = indexDetails?.prefixes?.[0] ?? ""

  const { mutateAsync: addKey, isPending } = useAddKey()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError(undefined)
    const trimmedSuffix = suffix.trim()
    if (!trimmedSuffix) {
      setError("Please enter a key name")
      return
    }
    const key = `${prefix}${trimmedSuffix}`
    try {
      await addKey({ key, type: dataType })
      setSelectedKey(key)
      setOpen(false)
      toast({ description: `Key "${key}" created` })
    } catch (error_) {
      setError(error_ instanceof Error ? error_.message : "Failed to create key")
    }
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(next) => {
        if (next) {
          setSuffix("")
          setError(undefined)
        }
        setOpen(next)
      }}
    >
      <SimpleTooltip content={indexName ? "Add key to index" : "Select an index first"}>
        <Button
          variant="primary"
          disabled={!indexName}
          onClick={() => setOpen(true)}
          className="flex h-8 select-none items-center gap-1 rounded-lg pl-2 pr-3 text-sm font-medium"
        >
          <IconPlus className="size-5" />
          Key
        </Button>
      </SimpleTooltip>

      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Add Key to Index</DialogTitle>
        </DialogHeader>
        <div className="sr-only">
          <DialogDescription>Add a new key to the selected search index</DialogDescription>
        </div>

        <form className="mt-2 flex flex-col gap-4" onSubmit={handleSubmit}>
          <div className="flex items-center gap-2 text-xs text-zinc-500">
            <span>Data type</span>
            <TypeTag variant={dataType} type="badge" />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="key-suffix">Key</Label>
            <div className="flex">
              {prefix && (
                <span className="flex select-none items-center whitespace-nowrap rounded-l-md border border-r-0 border-zinc-300 bg-zinc-100 px-2 text-sm text-zinc-500">
                  {prefix}
                </span>
              )}
              <Input
                id="key-suffix"
                autoFocus
                value={suffix}
                onChange={(e) => setSuffix(e.target.value)}
                placeholder="123"
                className={prefix ? "h-8 rounded-l-none" : "h-8"}
              />
            </div>
            <p className="text-xs text-zinc-500">
              The key is prefixed to match the index and created with its data type.
            </p>
          </div>

          {error && <p className="text-xs text-red-500">{error}</p>}

          <div className="flex justify-end gap-2">
            <Button type="button" variant="outline" onClick={() => setOpen(false)}>
              Cancel
            </Button>
            <Button variant="primary" type="submit" disabled={isPending}>
              <Spinner isLoading={isPending} isLoadingText="Creating">
                Create
              </Spinner>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
