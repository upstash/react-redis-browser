import { useEffect, useState } from "react"
import { useTab } from "@/tab-provider"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { Segmented } from "@/components/ui/segmented"
import { Toaster } from "@/components/ui/toaster"

import type { TabType } from ".."
import { useFetchSearchIndexes } from "../hooks/use-fetch-search-indexes"
import { KeysProvider } from "../hooks/use-keys"
import { DataDisplay } from "./display"
import { Header } from "./header"
import { HeaderError } from "./header-error"
import { QueryBuilder } from "./query-builder"
import { SearchEmptyState } from "./search-empty-state"
import { Sidebar } from "./sidebar"
import { UIQueryBuilder } from "./ui-query-builder"
import { hasMustShouldCombination } from "./ui-query-builder/query-parser"

export const PREFIX = "const query: Query = "

type QueryBuilderMode = "builder" | "code"

const QueryBuilderContent = () => {
  const { valuesSearch } = useTab()
  const [mode, setMode] = useState<QueryBuilderMode>("builder")
  const [switchError, setSwitchError] = useState<string | null>(null)

  const handleModeChange = (value: string) => {
    const newMode = value as QueryBuilderMode
    if (newMode === "builder") {
      if (hasMustShouldCombination(valuesSearch.query)) {
        setSwitchError(
          "Queries using both $must and $should are not supported in the UI query builder"
        )
        return
      }
      setSwitchError(null)
    } else {
      setSwitchError(null)
    }
    setMode(newMode)
  }

  return (
    <div>
      <div className="relative h-[200px] max-h-[40vh] min-h-[150px] resize-y overflow-hidden">
        <div className="absolute right-4 top-4 z-10">
          <Segmented
            options={[
              { key: "builder", label: "Query Builder" },
              { key: "code", label: "Code Editor" },
            ]}
            value={mode}
            onChange={handleModeChange}
            buttonClassName="h-6"
          />
        </div>
        {mode === "builder" ? <UIQueryBuilder /> : <QueryBuilder />}
      </div>
      {switchError && <p className="mt-3 text-sm text-red-500">{switchError}</p>}
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
          "flex min-h-0 grow flex-col rounded-md bg-white px-5 pb-5",
          hidden && "hidden"
        )}
      >
        <div className="space-y-3 py-5">
          <Header tabType={tabType} allowSearch={allowSearch} />

          {isValuesSearchSelected && !showEmptyState && <SearchContent />}
          <HeaderError />
        </div>

        {showEmptyState ? (
          <SearchEmptyState />
        ) : (
          <PanelGroup
            autoSaveId="persistence"
            direction="horizontal"
            className="h-full w-full text-sm antialiased"
          >
            <Panel defaultSize={30} minSize={30}>
              <Sidebar />
            </Panel>
            <PanelResizeHandle className="group mx-[2px] flex h-full flex-col items-center justify-center gap-1 rounded-md px-[8px] transition-colors hover:bg-zinc-300/10">
              <div className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
              <div className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
              <div className="h-[3px] w-[3px] rounded-full bg-zinc-300" />
            </PanelResizeHandle>
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
