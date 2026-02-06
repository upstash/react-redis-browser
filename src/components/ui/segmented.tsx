import React from "react"

import { cn } from "@/lib/utils"

// Custom component similar to the antd segmented component

export const Segmented = ({
  options,
  value,
  onChange,
  className,
  buttonClassName,
  selectedClassName,
  unselectedClassName,
}: {
  options: {
    key: string
    label: React.ReactNode
  }[]
  value: string
  onChange?: (value: string) => void
  className?: string
  buttonClassName?: string
  selectedClassName?: string
  unselectedClassName?: string
}) => {
  return (
    <div className={cn("flex w-fit gap-[2px] rounded-lg bg-zinc-200 p-[2px] text-sm", className)}>
      {options.map((option) => (
        <button
          className={cn(
            "h-7 rounded-md px-3 transition-all",
            value === option.key
              ? (selectedClassName ?? "bg-white text-zinc-950")
              : (unselectedClassName ?? "text-zinc-700"),
            buttonClassName
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
