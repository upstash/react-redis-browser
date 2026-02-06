import { useState } from "react"
import { useTab } from "@/tab-provider"
import { DATA_TYPES, type DataType } from "@/types"
import { DialogDescription } from "@radix-ui/react-dialog"
import { IconPlus } from "@tabler/icons-react"
import { Controller, useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog"
import { Input } from "@/components/ui/input"
import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"
import { SimpleTooltip } from "@/components/ui/tooltip"
import { TypeTag } from "@/components/databrowser/components/type-tag"
import { useAddKey } from "@/components/databrowser/hooks/use-add-key"

export function AddKeyModal() {
  const { setSelectedKey } = useTab()
  const [open, setOpen] = useState(false)

  const { mutateAsync: addKey, isPending } = useAddKey()
  const { control, handleSubmit, formState, reset } = useForm<{
    key: string
    type: DataType
  }>({
    defaultValues: {
      key: "",
      type: "string",
    },
  })

  const onSubmit = handleSubmit(async ({ key, type }) => {
    await addKey({ key, type })
    setSelectedKey(key)
    setOpen(false)
    setTimeout(() => {
      window.document.querySelector(`[data-key="${key}"]`)?.scrollIntoView({
        behavior: "smooth",
        block: "start",
        inline: "nearest",
      })
    }, 100)
  })

  return (
    <Dialog
      open={open}
      onOpenChange={(open) => {
        if (open) reset()
        setOpen(open)
      }}
    >
      <SimpleTooltip content="Add key">
        <DialogTrigger asChild>
          <Button
            variant="primary"
            data-testid="add-key-button"
            className="flex h-8 items-center gap-1 rounded-lg pl-2 pr-3 text-sm font-medium"
          >
            <IconPlus className="size-5" />
            Key
          </Button>
        </DialogTrigger>
      </SimpleTooltip>

      <DialogContent className="max-w-[400px]">
        <DialogHeader>
          <DialogTitle>Create new key</DialogTitle>
        </DialogHeader>
        <div className="sr-only">
          <DialogDescription>Create new key</DialogDescription>
        </div>

        <form className="mt-4" onSubmit={onSubmit}>
          <div className="flex gap-1">
            <Controller
              control={control}
              name="type"
              render={({ field }) => (
                <Select value={field.value} onValueChange={field.onChange}>
                  <SelectTrigger className="h-8 w-auto pl-[3px] pr-8">
                    <SelectValue />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectGroup>
                      {DATA_TYPES.filter((t) => t !== "search").map((type) => (
                        <SelectItem key={type} value={type}>
                          <TypeTag variant={type} type="badge" />
                        </SelectItem>
                      ))}
                    </SelectGroup>
                  </SelectContent>
                </Select>
              )}
            />
            <Controller
              rules={{
                required: "Please enter a key",
              }}
              control={control}
              name="key"
              render={({ field }) => <Input placeholder="mykey" {...field} className="h-8 grow" />}
            />
          </div>

          {formState.errors.key && (
            <p className="mb-3 mt-2 text-xs text-red-500">{formState.errors.key?.message}</p>
          )}

          <p className="mt-2 text-xs text-zinc-500">
            After creating the key, you can edit the value
          </p>

          <div className="mt-6 flex justify-end gap-2">
            <Button
              type="button"
              variant="outline"
              onClick={() => {
                setOpen(false)
              }}
            >
              Cancel
            </Button>
            <Button variant="primary" type="submit">
              <Spinner isLoading={isPending} isLoadingText={"Creating"}>
                Create
              </Spinner>
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  )
}
