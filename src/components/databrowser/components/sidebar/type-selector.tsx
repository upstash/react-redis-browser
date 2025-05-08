import { useDatabrowserStore } from "@/store"
import { DATA_TYPE_NAMES, type DataType } from "@/types"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

export function DataTypeSelector() {
  const { search, setSearchType } = useDatabrowserStore()

  return (
    <Select
      onValueChange={(type: DataType) => {
        setSearchType(type)
      }}
      value={search.type}
    >
      <SelectTrigger className="!w-auto select-none whitespace-nowrap rounded-r-none border-r-0 border-zinc-300 pr-8">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {Object.entries(DATA_TYPE_NAMES).map(
            ([key, value]) => (
              <SelectItem value={key} key={key}>
                {value}
              </SelectItem>
            )
          )}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
