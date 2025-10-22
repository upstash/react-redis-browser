import "@/globals.css"

import { useEffect, useMemo, useRef } from "react"
import { DarkModeProvider, useDarkMode, type DarkModeOption } from "@/dark-mode-context"
import { RedisProvider, type RedisCredentials } from "@/redis-context"
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
  darkMode = "light",
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

  /**
   * Dark mode configuration.
   *
   * @default "light"
   * @example
   * ```tsx
   * // Light mode (default)
   * <RedisBrowser darkMode="light" />
   *
   * // Dark mode
   * <RedisBrowser darkMode="dark" />
   * ```
   */
  darkMode?: DarkModeOption
}) => {
  const credentials = useMemo(() => ({ token, url }), [token, url])
  const rootRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    queryClient.resetQueries()
  }, [credentials.url])

  return (
    <QueryClientProvider client={queryClient}>
      <RedisProvider redisCredentials={credentials}>
        <DarkModeProvider darkMode={darkMode}>
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
  const theme = useDarkMode()
  

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
