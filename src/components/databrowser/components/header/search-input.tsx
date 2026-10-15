import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { IconSearch, IconX } from "@tabler/icons-react"

import { cn } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"

import { useKeys } from "../../hooks/use-keys"

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
  const { folderView } = useKeys()
  const { searchHistory, addSearchHistory } = useDatabrowserStore()
  const [state, setState] = useState(search.key)

  // Opening a folder clears the search
  useEffect(() => {
    setState(search.key)
  }, [search.key])

  const [isFocus, setIsFocus] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)

  const inputRef = useRef<HTMLInputElement>(null)
  const historyItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Inside a folder the search is relative to it, so the folder shows as a fixed prefix
  const prefix = folderView.enabled ? folderView.folder : ""

  const handleSubmit = (value: string) => {
    if (value.trim() !== "" && !value.includes("*")) value = `${value}*`
    // History keeps the full pattern, so it only comes up again in the same folder
    if (value) addSearchHistory(prefix + value)
    setSearchKey(value)
    setState(value)
  }

  const filteredHistory = dedupeSearchHistory(
    searchHistory
      .filter((item) => item.startsWith(prefix))
      .map((item) => item.slice(prefix.length))
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
    <div className="browser-search relative min-w-0 grow">
      <Popover open={isFocus && filteredHistory.length > 0}>
        <PopoverTrigger asChild>
          <div
            className="flex h-8 items-center rounded-md border border-zinc-300 bg-white font-normal"
            onMouseDown={(e) => {
              // Clicking the prefix focuses the input
              if (e.target !== inputRef.current) {
                e.preventDefault()
                inputRef.current?.focus()
              }
            }}
          >
            <IconSearch size={16} className="ml-2.5 shrink-0 text-zinc-400" />
            {prefix && (
              // Cut long folders from the left, the end is closest to the keys
              <span
                dir="rtl"
                title={prefix}
                className="ml-1.5 max-w-[50%] shrink-0 cursor-text truncate text-sm text-zinc-400"
              >
                <span dir="ltr">{prefix}</span>
              </span>
            )}
            <Input
              ref={inputRef}
              // A placeholder after the prefix would read like part of the key
              placeholder={prefix ? undefined : "Search"}
              className={cn("h-full min-w-0 border-none pr-6", prefix ? "pl-0" : "pl-1.5")}
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
