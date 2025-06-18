import { useCallback, useEffect, useRef, useState } from "react"

/**
 * Detects if an element's content is overflowing its container.
 */
export const useOverflow = () => {
  const [isOverflow, setIsOverflow] = useState(false)
  const observerRef = useRef<ResizeObserver | null>(null)

  // Use a callback ref to connect observer
  const ref = useCallback((node: HTMLElement) => {
    // Disconnect old observer if connected ref is changed
    if (observerRef.current) {
      observerRef.current.disconnect()
      observerRef.current = null
    }

    if (!node) return

    observerRef.current = new ResizeObserver((entries) => {
      const el = entries.at(0)?.target
      if (!el) return
      setIsOverflow(el.scrollWidth > el.clientWidth)
    })

    observerRef.current.observe(node)
  }, [])

  // Disconnect observer on unmount
  useEffect(() => {
    return () => {
      observerRef.current?.disconnect()
    }
  }, [])

  return { ref, isOverflow }
}
