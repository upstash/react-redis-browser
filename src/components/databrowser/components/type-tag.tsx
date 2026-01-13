import * as React from "react"
import { DATA_TYPE_NAMES, type DataType } from "@/types"
import {
  IconArrowsSort,
  IconCodeDots,
  IconHash,
  IconLayersIntersect,
  IconList,
  IconQuote,
  IconQuestionMark,
} from "@tabler/icons-react"
import { cva, type VariantProps } from "class-variance-authority"

import { cn } from "@/lib/utils"

const iconsMap: Record<string, React.ReactNode> = {
  string: <IconQuote size={15} stroke={1.2} />,
  set: <IconLayersIntersect size={15} stroke={1.2} />,
  hash: <IconHash size={15} stroke={1.2} />,
  json: <IconCodeDots size={15} stroke={1.2} />,
  zset: <IconArrowsSort size={15} stroke={1.2} />,
  list: <IconList size={15} stroke={1.2} />,
  stream: <IconList size={15} stroke={1.2} />,
}

const tagVariants = cva("inline-flex shrink-0 items-center rounded-md justify-center", {
  variants: {
    variant: {
      string: "bg-sky-200 text-sky-800",
      hash: "bg-amber-200 text-amber-800",
      set: "bg-indigo-200 text-indigo-800",
      zset: "bg-pink-200 text-pink-800",
      json: "bg-purple-200 text-purple-800",
      list: "bg-orange-200 text-orange-800",
      stream: "bg-green-200 text-green-800",
      default: "bg-gray-200 text-gray-800",
    },
    type: {
      icon: "size-5",
      badge: "h-6 px-2 uppercase whitespace-nowrap text-xs font-medium leading-none tracking-wide",
    },
  },
  defaultVariants: {
    variant: "default",
    type: "icon",
  },
})

export interface TypeTagProps
  extends React.ComponentProps<"span">,
    VariantProps<typeof tagVariants> {}

export function TypeTag({ className, variant, type }: TypeTagProps) {
  const defaultIcon = <IconQuestionMark size={15} stroke={1.2} />
  const variantKey = variant && variant in iconsMap ? variant : "default"
  
  return (
    <span className={cn(tagVariants({ variant: variantKey, type, className }))}>
      {type === "icon" 
        ? (iconsMap[variant as string] ?? defaultIcon)
        : (DATA_TYPE_NAMES[variant as DataType] ?? variant ?? "Unknown")}
    </span>
  )
}
