import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"

import { KeysProvider } from "../hooks/use-keys"
import { DataDisplay } from "./display"
import { Header } from "./header"
import { Sidebar } from "./sidebar"
import { useTab } from "@/tab-provider"
import { QueryBuilder } from "./query-builder"
import { HeaderError } from "./header-error"

export const PREFIX = "const query: Query = "

export const DatabrowserInstance = ({ hidden }: { hidden?: boolean }) => {
  const { isValuesSearchSelected } = useTab()
  return (
    <KeysProvider>
      <div className={cn("flex min-h-0 grow flex-col rounded-md bg-zinc-100", hidden && "hidden")}>
        <div className="space-y-3 p-5">
          <Header />

          {isValuesSearchSelected && <QueryBuilder />}
          <HeaderError />
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
