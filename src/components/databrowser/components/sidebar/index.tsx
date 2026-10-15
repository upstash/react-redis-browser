import { useListBarVariant } from "../../hooks/use-list-bar-variant"
import { SidebarVariant as SidebarA } from "./variants/a"
import { SidebarVariant as SidebarB } from "./variants/b"
import { SidebarVariant as SidebarC } from "./variants/c"

/** Design review build: renders one of the list bar designs, picked by `listBarVariant` */
export function Sidebar() {
  const variant = useListBarVariant()
  if (variant === "b") return <SidebarB />
  if (variant === "c") return <SidebarC />
  return <SidebarA />
}
