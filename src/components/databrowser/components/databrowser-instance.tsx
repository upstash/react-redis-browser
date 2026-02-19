import { useEffect, useState } from "react"
import { useTab } from "@/tab-provider"
import { Panel, PanelGroup } from "react-resizable-panels"

import { cn, formatUpstashErrorMessage } from "@/lib/utils"
import { ResizeHandle } from "@/components/ui/resize-handle"
import { Segmented } from "@/components/ui/segmented"
import { Toaster } from "@/components/ui/toaster"

import type { TabType } from ".."
import { useFetchSearchIndexes } from "../hooks/use-fetch-search-indexes"
import { KeysProvider, useKeys } from "../hooks/use-keys"
import { DataDisplay } from "./display"
import { DocsLink } from "./docs-link"
import { Header } from "./header"
import { HeaderError } from "./header-error"
import { QueryBuilder } from "./query-builder"
import { QueryBuilderError } from "./query-builder-error"
import { SearchEmptyState } from "./search-empty-state"
import { Sidebar } from "./sidebar"
import { UIQueryBuilder } from "./ui-query-builder"
import { hasMustShouldCombination } from "./ui-query-builder/query-parser"

export const PREFIX = "const query: Query = "

type QueryBuilderMode = "builder" | "code"

const QueryBuilderContent = () => {
  const { valuesSearch, queryBuilderMode, setQueryBuilderMode } = useTab()
  const { query } = useKeys()
  const [switchError, setSwitchError] = useState<string>()

  const handleModeChange = (value: string) => {
    const newMode = value as QueryBuilderMode
    if (newMode === "builder") {
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
    <div className="relative h-full">
      <div className="absolute right-4 top-4 z-[2]">
        <Segmented
          options={[
            { key: "builder", label: "Query Builder" },
            { key: "code", label: "Code Editor" },
          ]}
          value={queryBuilderMode}
          onChange={handleModeChange}
          buttonClassName="h-6"
        />
      </div>
      {queryBuilderMode === "builder" ? <UIQueryBuilder /> : <QueryBuilder />}
      <QueryBuilderError error={errorMessage} autoHide={Boolean(switchError)} />
      <DocsLink
        className="absolute bottom-2 right-2 text-sm"
        href="https://upstash-search.mintlify.app/redis/search/query-operators/boolean-operators/overview"
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
  const { isValuesSearchSelected, setIsValuesSearchSelected } = useTab()
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
          "flex min-h-0 grow flex-col rounded-[10px] bg-white px-5 pb-5",
          hidden && "hidden"
        )}
      >
        <div className="space-y-3 py-5">
          <Header tabType={tabType} allowSearch={allowSearch} />
          {!isValuesSearchSelected && <HeaderError />}
        </div>

        {showEmptyState ? (
          <SearchEmptyState />
        ) : isValuesSearchSelected ? (
          <PanelGroup
            autoSaveId="search-layout"
            direction="vertical"
            className="h-full w-full text-sm antialiased"
          >
            <Panel defaultSize={30} minSize={15} maxSize={60}>
              <SearchContent />
            </Panel>
            <ResizeHandle direction="vertical" />
            <Panel minSize={30}>
              <PanelGroup autoSaveId="persistence" direction="horizontal" className="h-full w-full">
                <Panel defaultSize={30} minSize={30}>
                  <Sidebar />
                </Panel>
                <ResizeHandle />
                <Panel minSize={40}>
                  <DataDisplay />
                </Panel>
              </PanelGroup>
            </Panel>
          </PanelGroup>
        ) : (
          <PanelGroup
            autoSaveId="persistence"
            direction="horizontal"
            className="h-full w-full text-sm antialiased"
          >
            <Panel defaultSize={30} minSize={30}>
              <Sidebar />
            </Panel>
            <ResizeHandle />
            <Panel minSize={40}>
              <DataDisplay />
            </Panel>
          </PanelGroup>
        )}
        <Toaster />
      </div>
    </KeysProvider>
  )
}
