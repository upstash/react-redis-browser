import { useState } from "react"
import { IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTab } from "@/tab-provider"
import { useDatabrowserStore } from "@/store"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

const dedupeSearchHistory = (history: string[]) => {
  const seen = new Set()
  return history.filter((item) => {
    if (!item || seen.has(item)) return false
    seen.add(item)
    return true
  })
}

export const SearchInput = () => {
  const { setSearchKey, search } = useTab()
  const { searchHistory, addSearchHistory } = useDatabrowserStore()
  const [state, setState] = useState(search.key)
  const [isFocus, setIsFocus] = useState(false)

  const handleSubmit = (value: string) => {
    if (value.trim() !== "" && !value.includes("*")) value = `${value}*`
    addSearchHistory(value)
    setSearchKey(value)
    setState(value)
  }

  const handleItemSelect = (value: string) => {
    addSearchHistory(value)
    setSearchKey(value)
    setState(value)
  }

  const filteredHistory = dedupeSearchHistory(
    searchHistory.filter((item) => item.includes(state) && item !== state)
  ).slice(0, 5)

  return (
    <div className="relative grow">
      <Popover open={isFocus && filteredHistory.length > 0}>
        <PopoverTrigger asChild>
          <div>
            <Input
              placeholder="Search"
              className={"rounded-l-none border-zinc-300 font-normal"}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSubmit(e.currentTarget.value)
                else if (e.key === "Escape") setState("")
              }}
              onChange={(e) => {
                setState(e.currentTarget.value)
                if (e.currentTarget.value.trim() === "") handleSubmit("")
              }}
              value={state}
              onFocus={() => setIsFocus(true)}
              onBlur={() => setIsFocus(false)}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[200px] divide-y px-3 py-2 text-[13px] text-zinc-900"
          autoFocus={false}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          {filteredHistory.map((item) => (
            <div key={item} className="w-full py-[2px]">
              <button
                onClick={() => handleItemSelect(item)}
                className="block w-full rounded-sm p-1 text-left transition-colors hover:bg-zinc-100"
              >
                {item}
              </button>
            </div>
          ))}
        </PopoverContent>
      </Popover>
      {state && (
        <Button
          type="button"
          variant="link"
          size="icon"
          className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2 text-gray-500 hover:text-gray-900 dark:text-gray-400 dark:hover:text-gray-100"
          onClick={() => {
            setSearchKey("")
            setState("")
          }}
        >
          <IconX size={16} />
          <span className="sr-only">Clear</span>
        </Button>
      )}{" "}
    </div>
  )
}
