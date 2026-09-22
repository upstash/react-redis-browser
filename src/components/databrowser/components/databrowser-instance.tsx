import { useEffect, useState } from "react"
import { useTab } from "@/tab-provider"
import { IconArrowLeft } from "@tabler/icons-react"
import { Panel, PanelGroup } from "react-resizable-panels"

import { cn, formatUpstashErrorMessage } from "@/lib/utils"
import { Button } from "@/components/ui/button"
import { ResizeHandle } from "@/components/ui/resize-handle"
import { Segmented } from "@/components/ui/segmented"
import { Toaster } from "@/components/ui/toaster"

import type { TabType } from ".."
import { useCompactLayout } from "../hooks/use-compact-layout"
import { useFetchSearchIndexes } from "../hooks/use-fetch-search-indexes"
import { KeysProvider, useKeys } from "../hooks/use-keys"
import { DataDisplay } from "./display"
import { DocsLink } from "./docs-link"
import { Header } from "./header"
import { HeaderError } from "./header-error"
import { QueryBuilder } from "./query-builder"
import { QueryBuilderError } from "./query-builder-error"
import { WizardButton } from "./query-wizard/wizard-button"
import { SearchEmptyState } from "./search-empty-state"
import { Sidebar } from "./sidebar"
import { UIQueryBuilder } from "./ui-query-builder"
import { hasMustShouldCombination } from "./ui-query-builder/query-parser"

export const PREFIX = "const query: Query = "

type QueryBuilderMode = "ui" | "code"

const QueryBuilderContent = () => {
  const compact = useCompactLayout()
  const { valuesSearch, queryBuilderMode, setQueryBuilderMode } = useTab()
  const { query } = useKeys()
  const [switchError, setSwitchError] = useState<string>()

  const handleModeChange = (value: string) => {
    const newMode = value as QueryBuilderMode
    if (newMode === "ui") {
      if (hasMustShouldCombination(valuesSearch.query)) {
        setSwitchError(
          "Queries using both $must and $should are not supported in the UI query builder"
        )
        return
      }
      setSwitchError(undefined)
    } else {
      setSwitchError(undefined)
    }
    setQueryBuilderMode(newMode)
  }

  const errorMessage =
    switchError ?? (query.error ? formatUpstashErrorMessage(query.error) : undefined)

  return (
    <div className="relative flex h-full min-h-0 flex-col">
      <div
        className={cn(
          "absolute right-4 top-4 z-[2] flex items-center gap-2",
          compact && "static shrink-0 flex-wrap p-2"
        )}
      >
        <WizardButton />
        <Segmented
          options={[
            { key: "ui", label: "Query Builder" },
            { key: "code", label: "Code Editor" },
          ]}
          value={queryBuilderMode}
          onChange={handleModeChange}
          buttonClassName="h-6"
        />
      </div>
      <div className="min-h-0 grow">
        {queryBuilderMode === "ui" ? <UIQueryBuilder /> : <QueryBuilder />}
      </div>
      <QueryBuilderError error={errorMessage} autoHide={Boolean(switchError)} />
      <DocsLink
        className="absolute bottom-2 right-2 text-sm"
        href="https://upstash.com/docs/redis/search/query-operators/boolean-operators/overview"
      />
    </div>
  )
}

const SearchContent = () => {
  const { data: indexes, isLoading } = useFetchSearchIndexes()

  if (isLoading) {
    return null
  }

  const hasIndexes = indexes && indexes.length > 0
  if (!hasIndexes) return <SearchEmptyState />

  return <QueryBuilderContent />
}

export const DatabrowserInstance = ({
  hidden,
  tabType,
  allowSearch,
}: {
  hidden?: boolean
  tabType: TabType
  allowSearch: boolean
}) => {
  const {
    isValuesSearchSelected,
    queryBuilderMode,
    setIsValuesSearchSelected,
    selectedKey,
    setSelectedKey,
  } = useTab()
  const compact = useCompactLayout()
  const showDetail = compact && selectedKey !== undefined
  const { data: indexes, isLoading } = useFetchSearchIndexes({
    enabled: tabType === "search",
  })

  // Force the correct tab based on tabType
  useEffect(() => {
    if (tabType === "keys" && isValuesSearchSelected) {
      setIsValuesSearchSelected(false)
    } else if (tabType === "search" && !isValuesSearchSelected) {
      setIsValuesSearchSelected(true)
    }
  }, [tabType, isValuesSearchSelected, setIsValuesSearchSelected])

  const showEmptyState = isValuesSearchSelected && !isLoading && (!indexes || indexes.length === 0)

  return (
    <KeysProvider>
      <div
        className={cn(
          "flex min-h-0 min-w-0 grow flex-col rounded-[10px] bg-white px-5 pb-5",
          compact && "px-1.5 pb-1.5",
          hidden && "hidden"
        )}
      >
        <div className={cn("shrink-0 space-y-3 py-5", compact && "py-2", showDetail && "hidden")}>
          <Header tabType={tabType} allowSearch={allowSearch} />
          {!isValuesSearchSelected && <HeaderError />}
        </div>

        {showDetail && (
          <Button
            variant="ghost"
            className="mb-2 h-8 shrink-0 gap-1.5 self-start px-1 shadow-none"
            onClick={() => setSelectedKey(undefined)}
          >
            <IconArrowLeft size={16} />
            {isValuesSearchSelected ? "Back to results" : "Back to keys"}
          </Button>
        )}
        {showEmptyState ? (
          <SearchEmptyState />
        ) : (
          // Keep the panel tree stable across breakpoints so editor forms and
          // list scroll positions survive rotation and container resizing.
          <PanelGroup
            autoSaveId="search-layout"
            direction="vertical"
            className="h-full w-full !overflow-visible text-sm antialiased"
          >
            {isValuesSearchSelected && (
              <Panel
                defaultSize={30}
                minSize={15}
                maxSize={60}
                className={cn(
                  queryBuilderMode === "code" && "!overflow-visible",
                  compact &&
                    "mb-2 !flex-[0_0_12rem] !overflow-auto rounded-xl border border-zinc-200",
                  showDetail && "hidden"
                )}
              >
                <SearchContent />
              </Panel>
            )}
            {isValuesSearchSelected && !compact && <ResizeHandle direction="vertical" />}
            <Panel minSize={30} className={cn(compact && "!flex-1")}>
              <PanelGroup autoSaveId="persistence" direction="horizontal" className="h-full w-full">
                {/* Hide the mobile list without unmounting its scroll area. */}
                <Panel
                  defaultSize={30}
                  minSize={30}
                  className={cn(compact && "!flex-1", showDetail && "hidden")}
                >
                  <Sidebar />
                </Panel>
                {!compact && <ResizeHandle />}
                <Panel
                  minSize={40}
                  className={cn(compact && "!flex-1", compact && !showDetail && "hidden")}
                >
                  <DataDisplay />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        )}
        <Toaster />
      </div>
    </KeysProvider>
  )
}
