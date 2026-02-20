import { PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"

export const ResizeHandle = ({
  direction = "horizontal",
}: {
  direction?: "horizontal" | "vertical"
}) => {
  const isHorizontal = direction === "horizontal"

  return (
    <PanelResizeHandle
      className={cn(
        "group flex items-center justify-center gap-1 rounded-md transition-colors hover:bg-zinc-300/10",
        isHorizontal ? "mx-[2px] h-full flex-col px-[8px]" : "my-[2px] w-full flex-row py-[8px]"
      )}
    >
      <div className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
      <div className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
      <div className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
    </PanelResizeHandle>
  )
}
