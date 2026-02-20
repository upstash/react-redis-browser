import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
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
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const historyItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  const handleSubmit = (value: string) => {
    if (value.trim() !== "" && !value.includes("*")) value = `${value}*`
    addSearchHistory(value)
    setSearchKey(value)
    setState(value)
  }

  const filteredHistory = dedupeSearchHistory(
    searchHistory
      .filter((item) => item.trim() !== "" && item.trim() !== "*")
      .filter((item) => item.includes(state) && item !== state)
  )
    .slice(0, 5)
    // If it has a * in the end, remove it
    .map((item) => (item.endsWith("*") ? item.slice(0, -1) : item))

  // Reset focused index when filtered history changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [filteredHistory.length])

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    if (e.key === "Enter") {
      const text =
        focusedIndex >= 0 && focusedIndex < filteredHistory.length
          ? filteredHistory[focusedIndex]
          : e.currentTarget.value
      handleSubmit(text)
    } else if (e.key === "Escape") {
      setState("")
      setFocusedIndex(-1)
      inputRef.current?.blur()
    } else if (e.key === "ArrowDown" || (e.key === "Tab" && !e.shiftKey)) {
      e.preventDefault()
      if (focusedIndex < filteredHistory.length - 1) {
        setFocusedIndex(focusedIndex + 1)
      } else if (filteredHistory.length > 0) {
        setFocusedIndex(0)
      }
    } else if (e.key === "ArrowUp" || (e.key === "Tab" && e.shiftKey)) {
      e.preventDefault()
      if (focusedIndex > 0) {
        setFocusedIndex(focusedIndex - 1)
      } else if (filteredHistory.length > 0 && focusedIndex === 0) {
        setFocusedIndex(-1)
        inputRef.current?.focus()
      } else if (filteredHistory.length > 0) {
        setFocusedIndex(filteredHistory.length - 1)
      }
    }
  }

  return (
    <div className="relative grow">
      <Popover open={isFocus && filteredHistory.length > 0}>
        <PopoverTrigger asChild>
          <div className="h-8 rounded-md border border-zinc-300 font-normal">
            <Input
              ref={inputRef}
              placeholder="Search"
              className={"h-full border-none pr-6"}
              onKeyDown={handleKeyDown}
              onChange={(e) => {
                setState(e.currentTarget.value)
                if (e.currentTarget.value.trim() === "") handleSubmit("")
              }}
              value={state}
              onFocus={() => {
                setIsFocus(true)
                setFocusedIndex(-1)
              }}
              onBlur={() => setIsFocus(false)}
            />
          </div>
        </PopoverTrigger>

        <PopoverContent
          className="w-[--radix-popover-trigger-width] divide-y px-3 py-2 text-[13px] text-zinc-900"
          autoFocus={false}
          onOpenAutoFocus={(e) => {
            e.preventDefault()
            e.stopPropagation()
          }}
        >
          {filteredHistory.map((item, index) => (
            <div key={item} className="w-full py-[3px]">
              <button
                ref={(el) => {
                  historyItemRefs.current[index] = el
                }}
                onClick={() => handleSubmit(item)}
                onMouseEnter={() => setFocusedIndex(index)}
                className={`block w-full truncate rounded-sm p-1 text-left transition-colors ${
                  focusedIndex === index ? "bg-zinc-100" : "hover:bg-zinc-100"
                }`}
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
          className="absolute right-1 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500 hover:text-zinc-900"
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
