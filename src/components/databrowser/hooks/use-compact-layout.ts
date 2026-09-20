import { createContext, useContext, useLayoutEffect, useState, type RefObject } from "react"

export const CompactLayoutContext = createContext(false)
export const useCompactLayout = () => useContext(CompactLayoutContext)

// Measure the embed, since a narrow console panel can sit in a wide viewport.
export const useCompactLayoutObserver = (rootRef: RefObject<HTMLDivElement>) => {
  const [compact, setCompact] = useState(false)

  useLayoutEffect(() => {
    const root = rootRef.current
    if (!root) return

    const update = () => {
      const width = root.getBoundingClientRect().width
      if (width > 0) setCompact(width < 640)
    }
    update()
    const observer = new ResizeObserver(update)
    observer.observe(root)
    return () => observer.disconnect()
  }, [rootRef])

  return compact
}
