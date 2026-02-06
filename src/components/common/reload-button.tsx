import { useState } from "react"
import { IconLoader2, IconRefresh } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { SimpleTooltip } from "@/components/ui/tooltip"

export const ReloadButton = ({
  onClick,
  isLoading: isLoadingProp,
}: {
  onClick: () => void
  isLoading?: boolean
}) => {
  const [isLoading, setIsLoading] = useState(false)

  const handleClick = () => {
    setIsLoading(true)
    onClick()
    setTimeout(() => {
      setIsLoading(false)
    }, 350)
  }

  return (
    <div>
      <SimpleTooltip content="Refresh">
        <Button
          variant="outline"
          size="icon"
          onClick={handleClick}
          disabled={isLoading || isLoadingProp}
        >
          {isLoading ? (
            <IconLoader2 className="size-5 animate-spin text-zinc-500" />
          ) : (
            <IconRefresh className="size-5 text-zinc-500 dark:text-zinc-600" />
          )}
        </Button>
      </SimpleTooltip>
    </div>
  )
}
