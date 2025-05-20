import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

type ScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  roundedInherit?: boolean
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(({ className, children, onScroll, roundedInherit = true, ...props }, ref) => (
  <ScrollAreaPrimitive.Root
    ref={ref}
    className={cn("relative overflow-hidden", className)}
    {...props}
  >
    <ScrollAreaPrimitive.Viewport
      onScroll={onScroll}
      className={cn("h-full w-full [&>div]:!block", roundedInherit && "rounded-[inherit]")}
    >
      {children}
    </ScrollAreaPrimitive.Viewport>
    <ScrollBar />
    <ScrollAreaPrimitive.Corner />
  </ScrollAreaPrimitive.Root>
))
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation="vertical"
    className={cn("flex h-full w-2 touch-none select-none transition-colors", className)}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn("relative flex-1 rounded-full bg-neutral-200/70 dark:bg-neutral-800")}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
