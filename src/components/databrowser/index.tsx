import "@/globals.css"

import { useEffect, useMemo } from "react"
import { DatabrowserProvider, type RedisCredentials } from "@/store"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { IconDotsVertical } from "@tabler/icons-react"
import { QueryClientProvider } from "@tanstack/react-query"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { queryClient } from "@/lib/clients"

import { Toaster } from "../ui/toaster"
import { DataDisplay } from "./components/display"
import { Sidebar } from "./components/sidebar"
import { KeysProvider } from "./hooks/use-keys"

export const RedisBrowser = ({ token, url }: RedisCredentials) => {
  const credentials = useMemo(() => ({ token, url }), [token, url])

  useEffect(() => {
    queryClient.resetQueries()
  }, [credentials.url])

  return (
    <QueryClientProvider client={queryClient}>
      <TooltipProvider>
        <DatabrowserProvider redisCredentials={credentials}>
          <KeysProvider>
            {/* ups-db is the custom class used to prefix every style in the css bundle */}
            <div className="ups-db" style={{ height: "100%" }}>
              <PanelGroup
                autoSaveId="persistence"
                direction="horizontal"
                className="h-full w-full gap-0.5 text-sm antialiased"
              >
                <Panel defaultSize={30} minSize={30}>
                  <Sidebar />
                </Panel>
                <PanelResizeHandle className="h-fullm flex w-1.5 items-center justify-center rounded-full hover:bg-zinc-300/20">
                  <IconDotsVertical
                    size={16}
                    stroke={1}
                    className="pointer-events-none shrink-0 opacity-20"
                  />
                </PanelResizeHandle>
                <Panel minSize={40}>
                  <DataDisplay />
                </Panel>
              </PanelGroup>
              <Toaster />
            </div>
          </KeysProvider>
        </DatabrowserProvider>
      </TooltipProvider>
    </QueryClientProvider>
  )
}
