import type { PropsWithChildren } from "react"
import { useEffect, useRef } from "react"
import { useTab } from "@/tab-provider"
import { IconLoader2 } from "@tabler/icons-react"
import type { UseInfiniteQueryResult } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export const InfiniteScroll = ({
  query,
  children,
  ...props
}: PropsWithChildren<{
  query: UseInfiniteQueryResult
}> &
  React.ComponentProps<typeof ScrollArea>) => {
  const { active } = useTab()
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch more on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
    if (scrollTop + clientHeight > scrollHeight - 100) {
      if (query.isFetching || !query.hasNextPage) {
        return
      }
      query.fetchNextPage()
    }
  }

  // Check if viewport is filled and fetch more if needed
  const checkAndFetchMore = () => {
    if (!scrollRef.current || !contentRef.current) return

    const viewportHeight = scrollRef.current.clientHeight
    const contentHeight = contentRef.current.clientHeight

    // Fetch until it overflows a bit
    const overflowThreshold = viewportHeight + 100

    if (contentHeight < overflowThreshold && query.hasNextPage && !query.isFetching) {
      query.fetchNextPage()
    }
  }

  useEffect(() => {
    if (!active) return
    // Timeout for dom update
    const timer = setTimeout(checkAndFetchMore, 100)
    return () => clearTimeout(timer)
  }, [active, query.data])

  return (
    <ScrollArea
      type="always"
      onScroll={handleScroll}
      {...props}
      className={cn(
        "block h-full w-full overflow-visible rounded-lg border border-zinc-200 bg-white p-1 pr-3 transition-all",
        props.className
      )}
      ref={scrollRef}
    >
      <div ref={contentRef}>
        {children}

        <div className="flex h-[100px] justify-center py-2 text-zinc-300">
          {query.isFetching && <IconLoader2 className="animate-spin" size={16} />}
        </div>
      </div>
    </ScrollArea>
  )
}
