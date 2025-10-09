import { useEffect, useState } from "react"

/**
 * Detects the system's color scheme preference and updates when it changes.
 * @returns "vs-dark" for dark mode, "light" for light mode
 */
export const useDarkMode = () => {
  const [theme, setTheme] = useState<"light" | "dark">(
    window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
  )

  useEffect(() => {
    const mediaQuery = window.matchMedia("(prefers-color-scheme: dark)")
    const handleChange = (e: MediaQueryListEvent) => {
      setTheme(e.matches ? "dark" : "light")
    }

    mediaQuery.addEventListener("change", handleChange)
    return () => mediaQuery.removeEventListener("change", handleChange)
  }, [])

  return theme
}
