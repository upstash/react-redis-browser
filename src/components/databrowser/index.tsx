import "@/globals.css"

import { useEffect, useMemo, useRef } from "react"
import { DarkModeProvider, useTheme, type DarkModeOption } from "@/dark-mode-context"
import { RedisProvider } from "@/redis-context"
import type { TabId } from "@/store"
import { DatabrowserProvider, useDatabrowserStore } from "@/store"
import { TabIdProvider } from "@/tab-provider"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { QueryClientProvider } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"
import { portalWrapper } from "@/lib/portal-root"

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
  disableTelemetry,
  onFullScreenClick,
  theme = "light",
}: {
  token: string
  url: string

  /**
   * Whether to disable telemetry.
   *
   * The redis client sends telemetry data to help us improve your experience.
   * We collect the following:
   * - SDK version
   * - Platform (Deno, Cloudflare, Vercel)
   * - Runtime version (node@18.x)
   *
   * @default false
   */
  disableTelemetry?: boolean

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

  /**
   * Theme configuration (light or dark).
   *
   * @default "light"
   * @example
   * ```tsx
   * // Light mode (default)
   * <RedisBrowser theme="light" />
   *
   * // Dark mode
   * <RedisBrowser theme="dark" />
   * ```
   */
  theme?: DarkModeOption
}) => {
  const credentials = useMemo(() => ({ token, url }), [token, url])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    queryClient.resetQueries()
  }, [credentials.url])

  return (
    <QueryClientProvider client={queryClient}>
      <RedisProvider redisCredentials={credentials} telemetry={!disableTelemetry}>
        <DarkModeProvider theme={theme}>
          <DatabrowserProvider storage={storage} rootRef={rootRef}>
            <TooltipProvider>
              <RedisBrowserRoot
                hideTabs={hideTabs}
                rootRef={rootRef}
                onFullScreenClick={onFullScreenClick}
              />
            </TooltipProvider>
          </DatabrowserProvider>
        </DarkModeProvider>
      </RedisProvider>
    </QueryClientProvider>
  )
}

const RedisBrowserRoot = ({
  hideTabs,
  rootRef,
  onFullScreenClick,
}: {
  hideTabs?: boolean
  rootRef: React.RefObject<HTMLDivElement>
  onFullScreenClick?: () => void
}) => {
  const theme = useTheme()

  useEffect(() => {
    portalWrapper.classList.add("text-zinc-700")
    portalWrapper.classList.toggle("dark", theme === "dark")
  }, [theme])

  return (
    /* ups-db is the custom class used to prefix every style in the css bundle */
    <div
      className={`ups-db ${theme === "dark" ? "dark" : ""}`}
      style={{ height: "100%" }}
      ref={rootRef}
    >
      <div className="flex h-full flex-col text-zinc-700">
        {!hideTabs && <DatabrowserTabs onFullScreenClick={onFullScreenClick} />}
        <DatabrowserInstances />
      </div>
    </div>
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
