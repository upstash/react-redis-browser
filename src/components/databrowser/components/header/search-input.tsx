import { useEffect, useRef, useState, type KeyboardEvent } from "react"
import { useDatabrowserStore } from "@/store"
import { useTab } from "@/tab-provider"
import { IconSearch, IconX } from "@tabler/icons-react"

import { cn, fromKeySearchPattern, toKeySearchPattern } from "@/lib/utils"
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

/**
 * Whether Tab should step through the history list instead of moving focus. Only once the user
 * entered the list with the keyboard (a hovered row doesn't count), and never past either end,
 * so Tab can't trap focus in the input.
 */
export const isHistoryTab = ({
  key,
  shiftKey,
  isHistoryOpen,
  focusedIndex,
  historyLength,
  isKeyboardNav,
}: {
  key: string
  shiftKey: boolean
  isHistoryOpen: boolean
  focusedIndex: number
  historyLength: number
  isKeyboardNav: boolean
}) =>
  key === "Tab" &&
  isHistoryOpen &&
  isKeyboardNav &&
  focusedIndex >= 0 &&
  (shiftKey || focusedIndex < historyLength - 1)

export const SearchInput = () => {
  const { setSearchKey, search } = useTab()
  const { folderView } = useKeys()
  const { searchHistory, addSearchHistory } = useDatabrowserStore()
  const [state, setState] = useState(fromKeySearchPattern(search.key))

  // Opening a folder clears the search
  useEffect(() => {
    setState(fromKeySearchPattern(search.key))
  }, [search.key])

  const [isFocus, setIsFocus] = useState(false)
  const [focusedIndex, setFocusedIndex] = useState(-1)
  // Whether focusedIndex was set with the keyboard rather than by hovering a row
  const [isKeyboardNav, setIsKeyboardNav] = useState(false)

  const inputRef = useRef<HTMLInputElement>(null)
  const historyItemRefs = useRef<(HTMLButtonElement | null)[]>([])

  // Inside a folder the search is relative to it, so the folder shows as a fixed prefix
  const prefix = folderView.enabled ? folderView.folder : ""

  // The input holds what the user typed; only the applied filter is a glob pattern
  const handleSubmit = (value: string) => {
    const pattern = toKeySearchPattern(value)
    // History keeps the full pattern, so it only comes up again in the same folder
    if (pattern) addSearchHistory(prefix + pattern)
    setSearchKey(pattern)
    setState(value)
  }

  const filteredHistory = dedupeSearchHistory(
    searchHistory
      .filter((item) => item.startsWith(prefix))
      .map((item) => item.slice(prefix.length))
      .filter((item) => item.trim() !== "" && item.trim() !== "*")
      // Show stored patterns as the text that produces them
      .map((item) => fromKeySearchPattern(item))
      .filter((item) => item.includes(state) && item !== state)
  ).slice(0, 5)

  // Reset focused index when filtered history changes
  useEffect(() => {
    setFocusedIndex(-1)
  }, [filteredHistory.length])

  const isHistoryOpen = isFocus && filteredHistory.length > 0

  const handleKeyDown = (e: KeyboardEvent<HTMLInputElement>) => {
    const isTabInHistory = isHistoryTab({
      key: e.key,
      shiftKey: e.shiftKey,
      isHistoryOpen,
      focusedIndex,
      historyLength: filteredHistory.length,
      isKeyboardNav,
    })

    if (e.key === "Enter") {
      const text =
        focusedIndex >= 0 && focusedIndex < filteredHistory.length
          ? filteredHistory[focusedIndex]
          : e.currentTarget.value
      handleSubmit(text)
    } else if (e.key === "Escape") {
      setSearchKey("")
      setState("")
      setFocusedIndex(-1)
      inputRef.current?.blur()
    } else if (e.key === "ArrowDown" || (isTabInHistory && !e.shiftKey)) {
      e.preventDefault()
      setIsKeyboardNav(true)
      if (focusedIndex < filteredHistory.length - 1) {
        setFocusedIndex(focusedIndex + 1)
      } else if (filteredHistory.length > 0) {
        setFocusedIndex(0)
      }
    } else if (e.key === "ArrowUp" || (isTabInHistory && e.shiftKey)) {
      e.preventDefault()
      setIsKeyboardNav(true)
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
      <Popover open={isHistoryOpen}>
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
                onMouseEnter={() => {
                  setFocusedIndex(index)
                  setIsKeyboardNav(false)
                }}
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
