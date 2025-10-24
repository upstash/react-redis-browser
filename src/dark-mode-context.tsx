import { createContext, useContext, type PropsWithChildren } from "react"

export type DarkModeOption = "dark" | "light"

const DarkModeContext = createContext<DarkModeOption | undefined>(undefined)

export const DarkModeProvider = ({
  children,
  theme,
}: PropsWithChildren<{ theme: DarkModeOption }>) => {
  return <DarkModeContext.Provider value={theme}>{children}</DarkModeContext.Provider>
}

export const useTheme = (): DarkModeOption => {
  const context = useContext(DarkModeContext)
  if (!context) {
    throw new Error("useDarkMode must be used within a DarkModeProvider")
  }
  return context
}
