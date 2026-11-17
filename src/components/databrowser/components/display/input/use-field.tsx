import { useEffect, useLayoutEffect, useMemo, useRef, useState } from "react"
import { useController, type UseFormReturn } from "react-hook-form"

import { ContentTypeSelect, type ContentType } from "./content-type-select"
import { CustomEditor } from "./custom-editor"
import {
  checkIsValidJSON,
  formatJSON,
  getJSONSource,
  registerStoredValueMapper,
  toStoredValue,
} from "./format-json"

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

  // JSON is only formatted for display. While unedited, the form keeps the stored value; after an
  // edit it keeps the editor text, which toStoredValues maps to the value to store on save, so
  // typing doesn't parse the whole value on every keystroke. The last editor text is kept with the
  // form value it was set to, so the editor keeps showing what was typed.
  const source = useMemo(() => getJSONSource(data), [data])
  const [edit, setEdit] = useState<{ text: string; value: string; data: string }>()

  const toStored = (value: string, type = contentType) =>
    type === "JSON" && source ? toStoredValue(value, source) : value
  const toStoredRef = useRef(toStored)
  useLayoutEffect(() => {
    toStoredRef.current = toStored
  })

  useEffect(
    () => registerStoredValueMapper(form.control, name, (value) => toStoredRef.current(value)),
    [form.control, name]
  )

  useEffect(() => {
    form.setValue(name, data, {
      shouldDirty: false,
    })
  }, [data])

  // An edit that maps back to the stored value (like whitespace in compact JSON) is not a change.
  // Checking it parses the whole value, so it runs once typing pauses instead of on each keystroke.
  useEffect(() => {
    if (!edit || edit.data !== data || edit.value === data) return
    const timer = setTimeout(() => {
      if (form.getValues(name) !== edit.value || toStoredRef.current(edit.value) !== data) return
      setEdit({ ...edit, value: data })
      field.onChange(data)
    }, 300)
    return () => clearTimeout(timer)
  }, [edit, data])

  const handleChange = (text: string, type = contentType) => {
    // The untouched formatted view stands for the stored value, so opening and saving is a no-op
    const value = type === "JSON" && source && text === source.formatted ? data : text
    setEdit({ text, value, data })
    field.onChange(value)
  }

  const handleTypeChange = (type: ContentType) => {
    setContentType(type)
    setEdit(undefined)
    if (field.value === data) return
    if (type === "JSON") {
      if (checkIsValidJSON(field.value)) handleChange(formatJSON(field.value), type)
    } else {
      // Text shows what will be stored, so apply the JSON mapping to the edit made so far
      field.onChange(toStored(field.value, contentType))
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
