import * as React from "react"
import * as ScrollAreaPrimitive from "@radix-ui/react-scroll-area"

import { cn } from "@/lib/utils"

type ScrollAreaProps = React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.Root> & {
  disableRoundedInherit?: boolean
  scrollBarClassName?: string
  scrollBarForceMount?: true
  orientation?: "vertical" | "horizontal" | "both"
}

const ScrollArea = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.Root>,
  ScrollAreaProps
>(
  (
    {
      className,
      scrollBarClassName,
      scrollBarForceMount,
      children,
      onScroll,
      disableRoundedInherit = false,
      orientation = "vertical",
      ...props
    },
    ref
  ) => (
    <ScrollAreaPrimitive.Root
      ref={ref}
      className={cn("relative overflow-hidden", className)}
      {...props}
    >
      <ScrollAreaPrimitive.Viewport
        onScroll={onScroll}
        className={cn(
          "h-full w-full [&>div]:!block",
          !disableRoundedInherit && "rounded-[inherit]"
        )}
      >
        {children}
      </ScrollAreaPrimitive.Viewport>
      {(orientation === "vertical" || orientation === "both") && (
        <ScrollBar
          className={scrollBarClassName}
          forceMount={scrollBarForceMount}
          orientation="vertical"
        />
      )}
      {(orientation === "horizontal" || orientation === "both") && (
        <ScrollBar
          className={scrollBarClassName}
          forceMount={scrollBarForceMount}
          orientation="horizontal"
        />
      )}
      <ScrollAreaPrimitive.Corner />
    </ScrollAreaPrimitive.Root>
  )
)
ScrollArea.displayName = ScrollAreaPrimitive.Root.displayName

const ScrollBar = React.forwardRef<
  React.ElementRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>,
  React.ComponentPropsWithoutRef<typeof ScrollAreaPrimitive.ScrollAreaScrollbar>
>(({ className, orientation = "vertical", ...props }, ref) => (
  <ScrollAreaPrimitive.ScrollAreaScrollbar
    ref={ref}
    orientation={orientation}
    className={cn(
      "flex touch-none select-none transition-colors",
      orientation === "vertical" && "mr-1 h-full w-2",
      orientation === "horizontal" && "mb-1 h-2 w-full flex-col",
      className
    )}
    {...props}
  >
    <ScrollAreaPrimitive.ScrollAreaThumb
      className={cn("relative flex-1 rounded-full bg-zinc-400/70")}
    />
  </ScrollAreaPrimitive.ScrollAreaScrollbar>
))
ScrollBar.displayName = ScrollAreaPrimitive.ScrollAreaScrollbar.displayName

export { ScrollArea, ScrollBar }
