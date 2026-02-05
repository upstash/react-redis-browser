import { useState } from "react"
import { useTab } from "@/tab-provider"
import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { Segmented } from "@/components/ui/segmented"
import { Toaster } from "@/components/ui/toaster"

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

/**
 * Content shown when on the Search tab.
 * Shows either the query builders (if indexes exist) or empty state (if no indexes).
 */
const SearchContent = () => {
  const { valuesSearch } = useTab()
  const { data: indexes, isLoading } = useFetchSearchIndexes()
  const [mode, setMode] = useState<QueryBuilderMode>("builder")

  // Error shown when switching to ui-query-builder
  const [switchError, setSwitchError] = useState<string | null>(null)

  const handleModeChange = (value: string) => {
    const newMode = value as QueryBuilderMode
    if (newMode === "builder") {
      // Check for unsupported $must + $should combination when switching to builder
      if (hasMustShouldCombination(valuesSearch.query)) {
        setSwitchError(
          "Queries using both $must and $should are not supported in the UI query builder"
        )
        // Don't switch mode, stay on code editor
        return
      }
      setSwitchError(null)
    } else {
      setSwitchError(null)
    }
    setMode(newMode)
  }

  // Don't show anything while loading
  if (isLoading) {
    return null
  }

  // Show empty state if no indexes exist
  const hasIndexes = indexes && indexes.length > 0
  if (!hasIndexes) {
    return <SearchEmptyState />
  }

  // Show query builders if indexes exist
  return (
    <div>
      <div className="relative h-[300px] max-h-[600px] min-h-[150px] resize-y overflow-hidden">
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

export const DatabrowserInstance = ({ hidden }: { hidden?: boolean }) => {
  const { isValuesSearchSelected } = useTab()
  return (
    <KeysProvider>
      <div
        className={cn(
          "flex min-h-0 grow flex-col rounded-md bg-white px-5 pb-5",
          hidden && "hidden"
        )}
      >
        <div className="space-y-3 py-5">
          <Header />

          {isValuesSearchSelected && <SearchContent />}
          <HeaderError />
        </div>
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
        <Toaster />
      </div>
    </KeysProvider>
  )
}
