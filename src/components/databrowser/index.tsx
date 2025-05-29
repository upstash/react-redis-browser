import "@/globals.css"

import { useEffect, useMemo } from "react"
import type { TabId } from "@/store"
import { DatabrowserProvider, useDatabrowserStore } from "@/store"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import { RedisProvider, type RedisCredentials } from "@/redis-context"

import { DatabrowserInstance } from "./components/databrowser-instance"
import { DatabrowserTabs } from "./components/databrowser-tabs"
import { TabIdProvider } from "@/tab-provider"

export const RedisBrowser = ({
  token,
  url,
  hideTabs,
}: RedisCredentials & { hideTabs?: boolean }) => {
  const credentials = useMemo(() => ({ token, url }), [token, url])

  useEffect(() => {
    queryClient.resetQueries()
  }, [credentials.url])

  return (
    <QueryClientProvider client={queryClient}>
      <RedisProvider redisCredentials={credentials}>
        <DatabrowserProvider>
          <TooltipProvider>
            {/* ups-db is the custom class used to prefix every style in the css bundle */}
            <div
              className="ups-db"
              style={{ height: "100%", display: "flex", flexDirection: "column" }}
            >
              {!hideTabs && <DatabrowserTabs />}
              <DatabrowserInstances />
            </div>
          </TooltipProvider>
        </DatabrowserProvider>
      </RedisProvider>
    </QueryClientProvider>
  )
}

const DatabrowserInstances = () => {
  const { tabs, selectedTab, addTab } = useDatabrowserStore()

  useEffect(() => {
    if (Object.keys(tabs).length === 0) addTab()
  }, [tabs])

  return Object.entries(tabs).map(([id]) => (
    <TabIdProvider key={id} value={id as TabId}>
      <DatabrowserInstance hidden={id !== selectedTab} />
    </TabIdProvider>
  ))
}
