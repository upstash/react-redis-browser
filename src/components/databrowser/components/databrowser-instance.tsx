import { Panel, PanelGroup, PanelResizeHandle } from "react-resizable-panels"

import { cn } from "@/lib/utils"
import { Toaster } from "@/components/ui/toaster"
import { DataDisplay } from "./display"
import { Sidebar } from "./sidebar"
import { KeysProvider } from "../hooks/use-keys"

export const DatabrowserInstance = ({ hidden }: { hidden?: boolean }) => {
  return (
    <KeysProvider>
      <div className={cn("h-full rounded-md bg-zinc-100", hidden && "hidden")}>
        <PanelGroup
          autoSaveId="persistence"
          direction="horizontal"
          className="h-full w-full gap-0.5 text-sm antialiased"
        >
          <Panel defaultSize={30} minSize={30}>
            <Sidebar />
          </Panel>
          <PanelResizeHandle className="group flex h-full w-1.5 justify-center">
            <div className="h-full border-r border-dashed border-zinc-200 transition-colors group-hover:border-zinc-300" />
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
