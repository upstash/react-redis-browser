import type { SelectedItem } from "@/store"
import { useDatabrowserStore } from "@/store"
import type { ListDataType } from "@/types"
import { Controller, FormProvider, useForm, useFormContext } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { useFetchListItems } from "../../hooks"
import { useEditListItem } from "../../hooks/use-edit-list-item"
import { headerLabels } from "./display-list"
import { useField } from "./input/use-field"

export const ListEditDisplay = ({
  dataKey,
  type,
  item,
}: {
  dataKey: string
  type: ListDataType
  item: SelectedItem
}) => {
  return (
    <div className="grow rounded-md bg-zinc-100 p-3">
      <ListEditForm key={item.key} item={item} type={type} dataKey={dataKey} />
    </div>
  )
}

const ListEditForm = ({
  type,
  dataKey,
  item: { key: itemKey, isNew },
}: {
  type: ListDataType
  dataKey: string
  item: SelectedItem
}) => {
  const query = useFetchListItems({
    type,
    dataKey,
  })
  // Search in pages for item value
  const findValue = () => {
    for (const page of query.data?.pages ?? []) {
      const item = page.keys.find((item) => item.key === itemKey)
      // Check if item has a value property before returning it
      if (item && "value" in item) return item.value as string
    }
    return
  }
  const itemValue = findValue()

  const form = useForm({
    defaultValues: {
      key: itemKey,
      value: itemValue,
    },
  })

  const { mutateAsync: editItem, isPending } = useEditListItem()
  const { setSelectedListItem } = useDatabrowserStore()

  const [keyLabel, valueLabel] = headerLabels[type]

  const onSubmit = form.handleSubmit(async ({ key, value }) => {
    await editItem({
      type: type,
      dataKey,
      itemKey,
      newKey: key,
      newValue: value,
      isNew: isNew,
    })
    setSelectedListItem(undefined)
  })

  return (
    <FormProvider {...form}>
      <form onSubmit={onSubmit} className="flex flex-col gap-2">
        <div className="flex grow flex-col gap-2">
          {type !== "list" && (
            <FormItem
              readOnly={type === "stream"}
              name="key"
              height={type === "set" ? 250 : 100}
              label={keyLabel}
              data={itemKey}
            />
          )}

          {type === "zset" ? (
            <NumberFormItem name="value" label={valueLabel} />
          ) : (
            type !== "set" && (
              <FormItem
                readOnly={type === "stream"}
                name="value"
                height={type === "list" ? 250 : 100}
                label={valueLabel}
                data={itemValue ?? ""}
              />
            )
          )}
        </div>

        <div className="flex justify-end gap-2">
          <Button
            type="button"
            onClick={() => {
              setSelectedListItem(undefined)
            }}
          >
            Cancel
          </Button>
          <SimpleTooltip
            content={type === "stream" && !isNew ? "Streams are not mutable" : undefined}
          >
            <Button
              variant="primary"
              type="submit"
              disabled={
                !form.formState.isValid || !form.formState.isDirty || (type === "stream" && !isNew)
              }
            >
              <Spinner isLoading={isPending} isLoadingText={"Saving"}>
                Save
              </Spinner>
            </Button>
          </SimpleTooltip>
        </div>
      </form>
    </FormProvider>
  )
}

const NumberFormItem = ({ name, label }: { name: string; label: string }) => {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex">
        <span className="text-xs font-medium text-zinc-700">{label}</span>
      </div>
      <Controller
        name={name}
        render={({ field }) => (
          <input
            className="plain-input rounded-md border border-zinc-300 px-3 py-1 shadow-sm"
            type="number"
            {...field}
          />
        )}
      />
    </div>
  )
}

const FormItem = ({
  name,
  label,
  height,
  readOnly,
  data,
}: {
  name: string
  label: string
  isNumber?: boolean
  height?: number
  readOnly?: boolean
  data: string
}) => {
  const form = useFormContext()
  const { editor, selector } = useField({
    name,
    form,
    height: height,
    showCopyButton: true,
    readOnly,
    data,
  })

  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-center gap-1 text-xs">
        <span className="font-medium text-zinc-700">{label}</span>{" "}
        <span className="text-zinc-300">/</span>
        {selector}
      </div>

      <div className="overflow-hidden rounded-md border border-zinc-300 bg-white p-2 shadow-sm">
        {editor}
      </div>
    </div>
  )
}
