import { useTab } from "@/tab-provider"
import { DATA_TYPE_NAMES, type DataType } from "@/types"

import {
  Select,
  SelectContent,
  SelectGroup,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"

const ALL_TYPES_KEY = "all"

export function DataTypeSelector({ hideSearchTab }: { hideSearchTab?: boolean }) {
  const { search, setSearchType } = useTab()

  return (
    <Select
      onValueChange={(type: DataType | typeof ALL_TYPES_KEY) => {
        if (type === ALL_TYPES_KEY) {
          setSearchType(undefined)
        } else {
          setSearchType(type)
        }
      }}
      value={search.type === undefined ? ALL_TYPES_KEY : search.type}
    >
      <SelectTrigger className="!w-auto select-none whitespace-nowrap border-zinc-300 pr-8">
        <SelectValue />
      </SelectTrigger>

      <SelectContent>
        <SelectGroup>
          {(() => {
            let entries: Array<[string, string]> = [
              [ALL_TYPES_KEY, "All Types"],
              ...Object.entries(DATA_TYPE_NAMES),
            ]
            if (hideSearchTab) entries = entries.filter(([key]) => key !== "search")
            return entries.map(([key, value]) => (
              <SelectItem value={key} key={key}>
                {value}
              </SelectItem>
            ))
          })()}
        </SelectGroup>
      </SelectContent>
    </Select>
  )
}
