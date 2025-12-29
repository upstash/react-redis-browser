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
      <div
        className={cn(
          "flex min-h-0 grow flex-col rounded-md bg-white px-5 pb-5",
          hidden && "hidden"
        )}
      >
        <div className="space-y-3 py-5">
          <Header />

          {isValuesSearchSelected && <QueryBuilder />}
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
