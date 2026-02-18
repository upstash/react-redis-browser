import { useEffect, useState } from "react"

import { cn } from "@/lib/utils"

const ERROR_TIMEOUT = 5000

export const QueryBuilderError = ({
  error,
  autoHide,
}: {
  error: string | undefined
  autoHide: boolean
}) => {
  const [visible, setVisible] = useState(false)
  const [displayedError, setDisplayedError] = useState<string>()

  useEffect(() => {
    let timeout: ReturnType<typeof setTimeout>
    if (error) {
      setDisplayedError(error)
      setVisible(true)
      if (autoHide) {
        timeout = setTimeout(() => setVisible(false), ERROR_TIMEOUT)
      }
    } else {
      setVisible(false)
    }
    return () => clearTimeout(timeout)
  }, [error, autoHide])

  if (!displayedError) return

  return (
    <p
      className={cn(
        "absolute bottom-2 left-2 z-[2] max-w-[70%] rounded-md bg-red-50 px-3 py-1.5 text-sm text-red-600 shadow-sm",
        visible
          ? "duration-200 animate-in fade-in slide-in-from-bottom-1"
          : "duration-200 animate-out fade-out slide-out-to-bottom-1 fill-mode-forwards"
      )}
      onAnimationEnd={() => {
        if (!visible) setDisplayedError(undefined)
      }}
    >
      {displayedError}
    </p>
  )
}
