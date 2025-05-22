import type { PropsWithChildren } from "react"
import { IconLoader2 } from "@tabler/icons-react"
import type { UseInfiniteQueryResult } from "@tanstack/react-query"

import { ScrollArea } from "@/components/ui/scroll-area"

export const InfiniteScroll = ({
  query,
  children,
  ...props
}: PropsWithChildren<{
  query: UseInfiniteQueryResult
}> &
  React.ComponentProps<typeof ScrollArea>) => {
  const handleScroll = (e: React.UIEvent<HTMLDivElement>) => {
    const { scrollTop, clientHeight, scrollHeight } = e.currentTarget
    if (scrollTop + clientHeight > scrollHeight - 100) {
      if (query.isFetching || !query.hasNextPage) {
        return
      }
      query.fetchNextPage()
    }
  }

  return (
    <ScrollArea
      type="always"
      className="block h-full w-full overflow-visible rounded-lg border border-zinc-200 bg-white p-1 pr-3 transition-all"
      onScroll={handleScroll}
      {...props}
    >
      {children}

      {/* scroll trigger */}
      <div className="flex h-[100px] justify-center py-2 text-zinc-300">
        {query.isFetching && <IconLoader2 className="animate-spin" size={16} />}
      </div>
    </ScrollArea>
  )
}
