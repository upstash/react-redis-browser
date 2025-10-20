import "@/globals.css"

import { useEffect, useMemo, useRef } from "react"
import { RedisProvider, type RedisCredentials } from "@/redis-context"
import type { TabId } from "@/store"
import { DatabrowserProvider, useDatabrowserStore } from "@/store"
import { TabIdProvider } from "@/tab-provider"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { DatabrowserInstance } from "./components/databrowser-instance"
import { DatabrowserTabs } from "./components/databrowser-tabs"

/**
 * Persistence storage interface for the Databrowser.
 */
export type RedisBrowserStorage = {
  set: (value: string) => void
  get: () => string | null
}

export const RedisBrowser = ({
  token,
  url,
  hideTabs,
  storage,
  onFullScreenClick,
}: RedisCredentials & {
  hideTabs?: boolean

  /**
   * If defined, the databrowser will have a full screen button in the tab bar.
   * Clicking on the button will call this function.
   * @returns
   */
  onFullScreenClick?: () => void

  /**
   * Persistence storage for the Databrowser.
   *
   * @example
   * ```tsx
   * <RedisBrowser storage={{
   *   set: (value: string) => localStorage.setItem("redis-browser-data", value),
   *   get: () => localStorage.getItem("redis-browser-data") || "",
   * }} />
   * ```
   */
  storage?: RedisBrowserStorage
}) => {
  const credentials = useMemo(() => ({ token, url }), [token, url])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    queryClient.resetQueries()
  }, [credentials.url])

  return (
    <QueryClientProvider client={queryClient}>
      <RedisProvider redisCredentials={credentials}>
        <DatabrowserProvider storage={storage} rootRef={rootRef}>
          <TooltipProvider>
            {/* ups-db is the custom class used to prefix every style in the css bundle */}
            <div
              className="ups-db"
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
              ref={rootRef}
            >
              {!hideTabs && <DatabrowserTabs onFullScreenClick={onFullScreenClick} />}
              <DatabrowserInstances />
            </div>
          </TooltipProvider>
        </DatabrowserProvider>
      </RedisProvider>
    </QueryClientProvider>
  )
}

const DatabrowserInstances = () => {
  const { tabs, selectedTab, selectTab, addTab } = useDatabrowserStore()

  useEffect(() => {
    if (tabs.length === 0) addTab()
    else if (!selectedTab) selectTab(tabs[0][0])
  }, [tabs, selectedTab, addTab, selectTab])

  if (!selectedTab) return

  return tabs.map(([id]) => (
    <TabIdProvider key={id} value={id as TabId}>
      <DatabrowserInstance hidden={id !== selectedTab} />
    </TabIdProvider>
  ))
}
