import { createContext, type PropsWithChildren, useContext } from "react"

export type DarkModeOption = "dark" | "light"

type DarkModeContextProps = {
  darkMode: DarkModeOption
}

const DarkModeContext = createContext<DarkModeContextProps | undefined>(undefined)

export const DarkModeProvider = ({
  children,
  darkMode,
}: PropsWithChildren<{ darkMode: DarkModeOption }>) => {
  return <DarkModeContext.Provider value={{ darkMode }}>{children}</DarkModeContext.Provider>
}

export const useDarkMode = (): DarkModeOption => {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error("useDarkMode must be used within a DarkModeProvider")
  }
  return context.darkMode
}
