import { useEffect } from "react"
import type { SimpleDataType } from "@/types"
import { useForm } from "react-hook-form"

import { Button } from "@/components/ui/button"
import { Spinner } from "@/components/ui/spinner"

import { useFetchSimpleKey } from "../../hooks/use-fetch-simple-key"
import { useSetSimpleKey } from "../../hooks/use-set-simple-key"
import { DisplayHeader } from "./display-header"
import { useField } from "./input/use-field"
import { KeyDeleted } from "./key-deleted"

export const EditorDisplay = ({ dataKey, type }: { dataKey: string; type: SimpleDataType }) => {
  const { data } = useFetchSimpleKey(dataKey, type)

  if (data === null) {
    return <KeyDeleted />
  }

  return (
    <div className="flex h-full min-h-0 w-full flex-col gap-2 overflow-hidden">
      <DisplayHeader dataKey={dataKey} type={type} content={data ?? undefined} />
      <div className="flex min-h-0 grow flex-col gap-2 rounded-md">
        {data === undefined ? (
          <Spinner isLoadingText={""} isLoading={true} />
        ) : (
          <EditorDisplayForm key={dataKey} dataKey={dataKey} type={type} data={data} />
        )}
      </div>
    </div>
  )
}

const EditorDisplayForm = ({
  dataKey,
  type,
  data,
}: {
  dataKey: string
  type: SimpleDataType
  data: string
}) => {
  const form = useForm({
    defaultValues: { value: data },
  })

  // Updates default values after submit
  useEffect(() => {
    form.reset({ value: data })
  }, [data])

  const { editor, selector } = useField({ name: "value", form, data })

  const { mutateAsync: setKey, isPending: isSettingKey } = useSetSimpleKey(dataKey, type)

  const handleCancel = () => {
    form.reset({ value: data })
  }

  return (
    <>
      <div className="flex min-h-0 grow flex-col gap-1">
        <div className="flex shrink-0 items-center gap-2">
          {type === "json" ? <div /> : selector}
        </div>

        <div className="min-h-0 grow rounded-md border border-zinc-300 bg-white p-2">{editor}</div>
      </div>

      <div className="flex shrink-0 items-center gap-2">
        <div className="ml-auto flex gap-2">
          {form.formState.isDirty && <Button onClick={handleCancel}>Cancel</Button>}

          <Button
            variant="primary"
            onClick={form.handleSubmit(async ({ value }) => {
              await setKey(value)
            })}
            disabled={!form.formState.isValid || !form.formState.isDirty}
          >
            <Spinner isLoading={isSettingKey} isLoadingText={"Saving"}>
              Save
            </Spinner>
          </Button>
        </div>
      </div>
    </>
  )
}
