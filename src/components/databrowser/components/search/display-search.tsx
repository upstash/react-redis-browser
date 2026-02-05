import { useEffect, useState } from "react"
import { Controller, useForm } from "react-hook-form"

import { formatUpstashErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { Spinner } from "@/components/ui/spinner"

import { useCreateSearchIndexSchema } from "../../hooks/use-create-search-index-schema"
import { useFetchSearchIndex } from "../../hooks/use-fetch-search-index"
import { DisplayHeader } from "../display/display-header"
import { TypeTag } from "../type-tag"
import { SaveSchemaModal } from "./save-schema-modal"
import { SCHEMA_DEFAULT, SchemaEditor } from "./schema-editor"
import { schemaToEditorValue } from "./schema-parser"

type FormValues = {
  indexName: string
  editorValue: string
  dataType: string
  prefixes: string
  language: string
}

export const SearchDisplay = ({
  indexName,
  isCreateModal,
  isEditModal,
  onClose,
}: {
  indexName?: string
  isCreateModal?: boolean
  isEditModal?: boolean
  onClose?: () => void
}) => {
  const {
    control,
    register,
    reset,
    watch,
    handleSubmit,
    formState: { isDirty, errors },
  } = useForm<FormValues>({
    defaultValues: {
      indexName: "",
      editorValue: SCHEMA_DEFAULT,
      dataType: "string",
      prefixes: "",
      language: "english",
    },
  })

  const currentIndexName = watch("indexName")
  const effectiveIndexName = isCreateModal ? currentIndexName : (indexName ?? "")

  const [pendingFormValues, setPendingFormValues] = useState<FormValues | undefined>()

  const { data, isLoading } = useFetchSearchIndex(indexName, {
    enabled: !isCreateModal,
  })
  const createSchema = useCreateSearchIndexSchema()

  useEffect(() => {
    if (!data) return
    reset({
      indexName: indexName ?? "",
      editorValue: data.schema ? schemaToEditorValue(data.schema) : SCHEMA_DEFAULT,
      dataType: data.dataType || "string",
      prefixes: data.prefixes?.join(", ") || "",
      language: data.language || "english",
    })
  }, [data, reset, indexName])

  const onSubmit = (values: FormValues) => {
    if (isCreateModal) {
      createSchema.mutate(
        {
          ...values,
          indexName: values.indexName,
        },
        {
          onSuccess: () => {
            reset()
            if (onClose) onClose()
          },
        }
      )
    } else {
      setPendingFormValues({ ...values, indexName: indexName! })
    }
  }

  const handleCancel = () => {
    createSchema.reset()
    reset()
  }

  return (
    <div className="flex h-full w-full min-w-0 flex-col gap-2">
      {!isCreateModal && (
        <DisplayHeader dataKey={effectiveIndexName} type={"search"} hideTypeTag={isEditModal} />
      )}

      <div className="flex h-full min-w-0 grow flex-col gap-2 rounded-md">
        {!isCreateModal && isLoading ? (
          <Spinner isLoadingText={""} isLoading={true} />
        ) : !isCreateModal && (data === null || data === undefined) ? (
          <div className="flex h-full items-center justify-center">
            <span className="text-zinc-500">No data found</span>
          </div>
        ) : (
          <div className="flex h-full w-full flex-col gap-3">
            {/* Index Name - only shown in create modal */}
            {isCreateModal && (
              <div className="flex flex-col gap-1.5">
                <Label htmlFor="index-name">Key</Label>
                <Input
                  id="index-name"
                  {...register("indexName", { required: "Please enter an index name" })}
                  placeholder="idx_users"
                />
                {errors.indexName && (
                  <p className="text-xs text-red-500">{errors.indexName.message}</p>
                )}
              </div>
            )}

            {/* Index Config */}
            <div className="rounded-md border border-zinc-300 bg-white p-3 dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Config</h3>
              </div>
              <div className="mt-2 grid grid-cols-4 gap-4 text-sm">
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Data Type
                  </span>
                  <Controller
                    name="dataType"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8 w-auto pl-[3px] pr-8">
                          <SelectValue placeholder="Select type" />
                        </SelectTrigger>
                        <SelectContent>
                          {(["string", "hash", "json"] as const).map((type) => (
                            <SelectItem key={type} value={type}>
                              <TypeTag variant={type} type="badge" />
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div>
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Language
                  </span>
                  <Controller
                    name="language"
                    control={control}
                    render={({ field }) => (
                      <Select value={field.value} onValueChange={field.onChange}>
                        <SelectTrigger className="h-8">
                          <SelectValue placeholder="Select language" />
                        </SelectTrigger>
                        <SelectContent>
                          {LANGUAGES.map((lang) => (
                            <SelectItem key={lang} value={lang}>
                              {lang}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    )}
                  />
                </div>
                <div className="col-span-2">
                  <span className="mb-1.5 block text-xs font-medium text-zinc-500 dark:text-zinc-400">
                    Prefixes
                  </span>
                  <Input
                    {...register("prefixes", { required: "Please enter at least one prefix" })}
                    className="h-8 w-full"
                    placeholder="user:, post:"
                  />
                  {errors.prefixes && (
                    <p className="mt-1 text-xs text-red-500">{errors.prefixes.message}</p>
                  )}
                </div>
              </div>
            </div>

            {/* Schema Section */}
            <div className="flex min-h-0 flex-1 flex-col rounded-md border border-zinc-300 bg-white dark:border-zinc-700 dark:bg-zinc-800">
              <div className="flex items-center justify-between border-b border-zinc-200 px-3 py-2 dark:border-zinc-700">
                <h3 className="text-sm font-medium text-zinc-700 dark:text-zinc-300">Schema</h3>
              </div>

              <div className="min-h-0 flex-1">
                <div className="h-full px-1">
                  <Controller
                    name="editorValue"
                    control={control}
                    render={({ field }) => (
                      <SchemaEditor
                        value={field.value}
                        onChange={field.onChange}
                        height={isCreateModal || isEditModal ? 300 : undefined}
                      />
                    )}
                  />
                </div>
              </div>
            </div>

            {/* Mutation error display - only for create modal */}
            {isCreateModal && createSchema.error && (
              <div className="w-full break-words text-xs text-red-500">
                {createSchema.error.message.startsWith("ERR syntax error")
                  ? "Invalid schema"
                  : formatUpstashErrorMessage(createSchema.error)}
              </div>
            )}

            {/* Save/Cancel buttons */}
            <div className="flex shrink-0 items-center gap-2">
              <div className="ml-auto flex gap-2">
                {(isDirty || isCreateModal || isEditModal) && (
                  <Button
                    onClick={() => {
                      if ((isCreateModal || isEditModal) && onClose) {
                        onClose()
                      } else {
                        handleCancel()
                      }
                    }}
                  >
                    Cancel
                  </Button>
                )}
                <Button variant="primary" onClick={handleSubmit(onSubmit)} disabled={!isDirty}>
                  <Spinner isLoading={createSchema.isPending} isLoadingText={"Saving"}>
                    {isCreateModal ? "Create" : "Save..."}
                  </Spinner>
                </Button>
              </div>
            </div>

            <SaveSchemaModal
              values={pendingFormValues}
              onClose={() => {
                setPendingFormValues(undefined)
                reset()
                if (isEditModal && onClose) onClose()
              }}
            />
          </div>
        )}
      </div>
    </div>
  )
}

const LANGUAGES = [
  "english",
  "arabic",
  "danish",
  "dutch",
  "finnish",
  "french",
  "german",
  "greek",
  "hungarian",
  "italian",
  "norwegian",
  "portuguese",
  "romanian",
  "russian",
  "spanish",
  "swedish",
  "tamil",
  "turkish",
]
