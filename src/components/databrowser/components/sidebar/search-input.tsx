import { useState } from "react"
import { IconX } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { useTab } from "@/tab-provider"

export const SearchInput = () => {
  const { setSearchKey, search } = useTab()
  const [state, setState] = useState(search.key)

  const submit = (value: string) => {
    if (value.trim() !== "" && !value.includes("*")) value = `${value}*`
    setSearchKey(value)
    setState(value)
  }

  return (
    <div className="relative grow">
      <Input
        placeholder="Search"
        className={"rounded-l-none border-zinc-300 font-normal"}
        onKeyDown={(e) => {
          if (e.key === "Enter") submit(e.currentTarget.value)
        }}
        onChange={(e) => {
          setState(e.currentTarget.value)
          if (e.currentTarget.value.trim() === "") submit("")
        }}
        value={state}
      />
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
      )}
    </div>
  )
}
