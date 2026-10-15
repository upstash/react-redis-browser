import { createContext, useContext } from "react"

/** The list bar designs under review: A view menu, B tabs above the list, C footer */
export type ListBarVariant = "a" | "b" | "c"

export const ListBarVariantContext = createContext<ListBarVariant>("a")
export const useListBarVariant = () => useContext(ListBarVariantContext)
