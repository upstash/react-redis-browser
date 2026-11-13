import { useEffect, useMemo, useState } from "react"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

import { checkIsValidJSON } from "./format-json"

export type ContentType = "Text" | "JSON"

export const ContentTypeSelect = ({
  value,
  onChange,
  data,
}: {
  value: ContentType
  onChange: (value: ContentType) => void
  data: string
}) => {
  // Parsing a large value on every keystroke is slow, so check it once typing pauses
  const [checkedData, setCheckedData] = useState(data)
  useEffect(() => {
    const timer = setTimeout(() => setCheckedData(data), 300)
    return () => clearTimeout(timer)
  }, [data])
  const isValidJSON = useMemo(() => checkIsValidJSON(checkedData), [checkedData])

  return (
    <Select value={value} onValueChange={onChange}>
      <SelectTrigger className="h-6 w-auto border-none bg-transparent pl-0 pr-6 text-xs text-zinc-500">
        <SelectValue placeholder="Text" />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          <SelectItem value={"Text"}>Text</SelectItem>
          <SelectItem disabled={!isValidJSON} value={"JSON"}>
            JSON
          </SelectItem>
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
