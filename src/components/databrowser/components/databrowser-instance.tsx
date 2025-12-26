import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"

import { KeysProvider } from "../hooks/use-keys"
import { useFetchSearchIndex } from "../hooks/use-fetch-search-index"
import { DataDisplay } from "./display"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { useTab } from "@/tab-provider"
import { QueryEditor } from "./display/input/query-editor"

export const QueryBuilder = () => {
  const { valuesSearch, setValuesSearchQuery } = useTab()
  const { data: indexDetails } = useFetchSearchIndex(valuesSearch.index)

  return (
    <div className="rounded-lg border border-zinc-300 bg-white px-[6px] dark:border-zinc-700 dark:bg-zinc-900">
      <QueryEditor
        height={200}
        value={valuesSearch.query}
        onChange={setValuesSearchQuery}
        schema={indexDetails?.schema}
      />
    </div>
  )
}

export const DatabrowserInstance = ({ hidden }: { hidden?: boolean }) => {
  const { isValuesSearchSelected } = useTab()
  return (
    <KeysProvider>
      <div className={cn("min-h-0 grow rounded-md bg-zinc-100", hidden && "hidden")}>
        <div className="space-y-3 p-5">
          <Header />

          {isValuesSearchSelected && <QueryBuilder />}
        </div>
        <PanelGroup
          autoSaveId="persistence"
          direction="horizontal"
          className="h-full w-full gap-0.5 text-sm antialiased"
        >
          <Panel defaultSize={30} minSize={30}>
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="group flex h-full w-3 justify-center">
            <div className="h-full border-r border-dashed border-zinc-200 transition-colors group-hover:border-zinc-500" />
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
