import React from "react"

import { cn } from "@/lib/utils"

// Custom component similar to the antd segmented component

export const Segmented = ({
  options,
  value,
  onChange,
}: {
  options: {
    key: string
    label: React.ReactNode
  }[]
  value: string
  onChange?: (value: string) => void
}) => {
  return (
    <div className="flex w-fit gap-[2px] rounded-lg bg-zinc-200 p-[2px] text-sm">
      {options.map((option) => (
        <button
          className={cn(
            "h-7 rounded-md px-3 transition-all",
            value === option.key ? "bg-white text-zinc-950" : "text-zinc-700"
          )}
          key={option.key}
          onClick={() => {
            onChange?.(option.key)
          }}
        >
          {option.label}
        </button>
      ))}
    </div>
  )
}
