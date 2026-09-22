import type { PropsWithChildren, ReactNode } from "react"
import { useCallback, useEffect, useRef } from "react"
import { useTab } from "@/tab-provider"
import { IconLoader2 } from "@tabler/icons-react"
import type { UseInfiniteQueryResult } from "@tanstack/react-query"

import { cn } from "@/lib/utils"
import { ScrollArea } from "@/components/ui/scroll-area"

export const InfiniteScroll = ({
  query,
  children,
  // When false, scrolling / viewport-fill won't auto-fetch the next page. Used to
  // pause runaway fetching (e.g. a type filter that matches nothing) and hand
  // control to an explicit continue action rendered via `endSlot`.
  autoFetch = true,
  endSlot,
  ...props
}: PropsWithChildren<{
  query: UseInfiniteQueryResult
  autoFetch?: boolean
  endSlot?: ReactNode
}> &
  React.ComponentProps<typeof ScrollArea>) => {
  const { active } = useTab()
  const scrollRef = useRef<HTMLDivElement>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Fetch more on scroll
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    if (!active || !autoFetch || e.currentTarget.clientHeight === 0) return
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
    if (scrollTop + clientHeight > scrollHeight - 100) {
      if (query.isFetching || !query.hasNextPage) {
        return
      }
      query.fetchNextPage()
    }
  }

  // Check if viewport is filled and fetch more if needed
  const checkAndFetchMore = useCallback(() => {
    if (!active || !autoFetch) return
    if (!scrollRef.current || !contentRef.current) return

    const viewportHeight = scrollRef.current.clientHeight
    // Hidden mobile lists and inactive tabs must not drain the remaining pages.
    if (viewportHeight === 0) return
    const contentHeight = contentRef.current.clientHeight

    // Fetch until it overflows a bit
    const overflowThreshold = viewportHeight + 100

    if (contentHeight < overflowThreshold && query.hasNextPage && !query.isFetching) {
      query.fetchNextPage()
    }
  }, [active, autoFetch, query.hasNextPage, query.isFetching, query.fetchNextPage])

  useEffect(() => {
    const viewport = scrollRef.current
    if (!active || !viewport) return

    // Back navigation and resizing can reveal a list without changing query data.
    let timer = setTimeout(checkAndFetchMore, 100)
    const observer = new ResizeObserver(() => {
      clearTimeout(timer)
      timer = setTimeout(checkAndFetchMore, 100)
    })
    observer.observe(viewport)
    return () => {
      clearTimeout(timer)
      observer.disconnect()
    }
  }, [active, checkAndFetchMore, query.data])

  return (
    <ScrollArea
      type="always"
      onScroll={handleScroll}
      {...props}
      className={cn("block h-full min-h-0 w-full overflow-hidden transition-all", props.className)}
      ref={scrollRef}
    >
      <div ref={contentRef}>
        {children}

        <div className="flex h-[100px] justify-center py-2 text-zinc-300">
          {query.isFetching ? <IconLoader2 className="animate-spin" size={16} /> : endSlot}
        </div>
      </div>
    </ScrollArea>
  )
}
