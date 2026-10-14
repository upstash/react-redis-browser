import { useEffect, useMemo, useState } from "react"
import { useController, type UseFormReturn } from "react-hook-form"

import { ContentTypeSelect, type ContentType } from "./content-type-select"
import { CustomEditor } from "./custom-editor"
import { formatJSON } from "./format-json"

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

  // The form keeps the raw value, JSON is only formatted for display. Untouched content maps back
  // to the raw value so saving never rewrites bytes the user did not edit.
  const formatted = useMemo(
    () => (contentType === "JSON" && checkIsValidJSON(data) ? formatJSON(data) : data),
    [contentType, data]
  )
  const toFormValue = (value: string) => (value === formatted ? data : value)

  useEffect(() => {
    form.setValue(name, data, {
      shouldDirty: false,
    })
  }, [data])

  const handleTypeChange = (type: ContentType) => {
    setContentType(type)
    if (type === "JSON" && field.value !== data && checkIsValidJSON(field.value)) {
      const value = formatJSON(field.value)
      const isUnchanged = checkIsValidJSON(data) && value === formatJSON(data)
      form.setValue(name, isUnchanged ? data : value, {
        shouldDirty: true,
      })
    }
  }

  return {
    selector: (
      <ContentTypeSelect value={contentType} onChange={handleTypeChange} data={field.value} />
    ),
    editor: (
      <>
        <CustomEditor
          language={contentType === "JSON" ? "json" : "plaintext"}
          value={field.value === data ? formatted : field.value}
          onChange={(value) => field.onChange(toFormValue(value))}
          height={height}
          showCopyButton={showCopyButton}
          readOnly={readOnly}
        />
      </>
    ),
  }
}

export const checkIsValidJSON = (value: string) => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}
