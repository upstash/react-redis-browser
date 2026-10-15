import { createContext, useContext } from "react"

/** False when the embedder turns the folder view off with `disableFolders` */
export const FoldersEnabledContext = createContext(true)
export const useFoldersEnabled = () => useContext(FoldersEnabledContext)
