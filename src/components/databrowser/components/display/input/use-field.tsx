import { useEffect, useMemo, useState } from "react"
import { useController, type UseFormReturn } from "react-hook-form"

import { ContentTypeSelect, type ContentType } from "./content-type-select"
import { CustomEditor } from "./custom-editor"
import { checkIsValidJSON, formatJSON, getJSONSource, toStoredValue } from "./format-json"

export const useField = ({
  name,
  form,
  height,
  showCopyButton,
  readOnly,
  data,
}: {
  name: string
  form: UseFormReturn<any>
  height?: number
  showCopyButton?: boolean
  readOnly?: boolean
  data: string
}) => {
  const { field } = useController<Record<string, string>>({
    name,
    control: form.control,
  })

  const [contentType, setContentType] = useState<ContentType>(() =>
    checkIsValidJSON(field.value) ? "JSON" : "Text"
  )

  // The form keeps the stored value, JSON is only formatted for display. The last editor text is
  // kept with the value it was stored as, so the editor keeps showing what was typed.
  const source = useMemo(() => getJSONSource(data), [data])
  const [edit, setEdit] = useState<{ text: string; value: string; data: string }>()

  useEffect(() => {
    form.setValue(name, data, {
      shouldDirty: false,
    })
  }, [data])

  const handleChange = (text: string, type = contentType) => {
    const value = type === "JSON" && source ? toStoredValue(text, source) : text
    setEdit({ text, value, data })
    field.onChange(value)
  }

  const handleTypeChange = (type: ContentType) => {
    setContentType(type)
    setEdit(undefined)
    if (type === "JSON" && field.value !== data && checkIsValidJSON(field.value)) {
      handleChange(formatJSON(field.value), type)
    }
  }

  const editorValue =
    edit && edit.data === data && edit.value === field.value
      ? edit.text
      : field.value === data && contentType === "JSON" && source
        ? source.formatted
        : field.value

  return {
    selector: (
      <ContentTypeSelect value={contentType} onChange={handleTypeChange} data={field.value} />
    ),
    editor: (
      <>
        <CustomEditor
          language={contentType === "JSON" ? "json" : "plaintext"}
          value={editorValue}
          onChange={(text) => handleChange(text)}
          height={height}
          showCopyButton={showCopyButton}
          readOnly={readOnly}
        />
      </>
    ),
  }
}
