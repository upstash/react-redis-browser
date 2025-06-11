import type { PropsWithChildren } from "react"
import { IconLoader2 } from "@tabler/icons-react"
import type { UseInfiniteQueryResult } from "@tanstack/react-query"
import { useEffect, useRef } from "react"

import { ScrollArea } from "@/components/ui/scroll-area"

export const InfiniteScroll = ({
  query,
  children,
}: PropsWithChildren<{
  query: UseInfiniteQueryResult
}>) => {
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
    // Timeout for dom update
    const timer = setTimeout(checkAndFetchMore, 100)
    return () => clearTimeout(timer)
  }, [query.data])

  return (
    <ScrollArea
      type="always"
      className="block h-full w-full transition-all"
      onScroll={handleScroll}
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
