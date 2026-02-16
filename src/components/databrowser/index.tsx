import "@/globals.css"

import { useEffect, useMemo, useRef } from "react"
import { DarkModeProvider, useTheme, type DarkModeOption } from "@/dark-mode-context"
import { RedisProvider } from "@/redis-context"
import type { RedisCredentials, TabId } from "@/store"
import { DatabrowserProvider, useDatabrowserStore } from "@/store"
import { TabIdProvider } from "@/tab-provider"
import { TooltipProvider } from "@radix-ui/react-tooltip"
import { QueryClientProvider } from "@tanstack/react-query"

import type { UseQueryWizard } from "@/types/query-wizard"
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

export type TabType = "keys" | "search" | "all"

export const RedisBrowser = ({
  url,
  token,
  hideTabs,
  tabType = "all",
  storage,
  disableTelemetry,
  onFullScreenClick,
  theme = "light",
  allowSearch = false,
  useQueryWizard,
}: RedisCredentials & {
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
   * Which tab(s) to show in the databrowser.
   * - "keys": Only show the Keys tab
   * - "search": Only show the Search tab
   * - "all": Show both tabs with a segmented selector
   *
   * @default "all"
   */
  tabType?: TabType

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

  /**
   * Whether to allow picking the "Search Index" type filter in keys search.
   *
   * This option is temporary
   *
   * @default true
   */
  allowSearch?: boolean

  /**
   * AI Query Wizard function for generating Redis search queries from natural language.
   * When provided, a wizard button (🪄) appears in the Search tab that allows users to
   * generate queries using AI.
   *
   * The function receives:
   * - prompt: User's natural language query
   * - schema: Current index schema
   * - sampleData: First ~10 items from the database
   * - searchTypes: Redis search type definitions
   *
   * And should return a query object.
   *
   * @example
   * ```tsx
   * <RedisBrowser
   *   useQueryWizard={async ({ prompt, schema, sampleData, searchTypes }) => {
   *     const response = await fetch('/api/generate-query', {
   *       method: 'POST',
   *       body: JSON.stringify({ prompt, schema, sampleData, searchTypes }),
   *     })
   *     return await response.json()
   *   }}
   * />
   * ```
   */
  useQueryWizard?: UseQueryWizard
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
                allowSearch={allowSearch}
                hideTabs={hideTabs}
                tabType={tabType}
                rootRef={rootRef}
                onFullScreenClick={onFullScreenClick}
                useQueryWizard={useQueryWizard}
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
  tabType,
  allowSearch,
  rootRef,
  onFullScreenClick,
  useQueryWizard,
}: {
  hideTabs?: boolean
  tabType: TabType
  allowSearch: boolean
  rootRef: React.RefObject<HTMLDivElement>
  onFullScreenClick?: () => void
  useQueryWizard?: UseQueryWizard
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
      <div className="flex h-full flex-col rounded-[14px] border-[4px] border-zinc-300 text-zinc-700">
        {!hideTabs && <DatabrowserTabs onFullScreenClick={onFullScreenClick} />}
        <DatabrowserInstances
          tabType={tabType}
          allowSearch={allowSearch}
          useQueryWizard={useQueryWizard}
        />
      </div>
    </div>
  )
}

const DatabrowserInstances = ({
  tabType,
  allowSearch,
  useQueryWizard,
}: {
  tabType: TabType
  allowSearch: boolean
  useQueryWizard?: UseQueryWizard
}) => {
  const { tabs, selectedTab, selectTab, addTab } = useDatabrowserStore()

  useEffect(() => {
    if (tabs.length === 0) addTab()
    else if (!selectedTab) selectTab(tabs[0][0])
  }, [tabs, selectedTab, addTab, selectTab])

  if (!selectedTab) return

  return tabs.map(([id]) => (
    <TabIdProvider key={id} value={id as TabId}>
      <DatabrowserInstance
        hidden={id !== selectedTab}
        tabType={tabType}
        allowSearch={allowSearch}
        useQueryWizard={useQueryWizard}
      />
    </TabIdProvider>
  ))
}
