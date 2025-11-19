import { useState } from "react"

import { Button } from "@/components/ui/button"
import { SimpleTooltip } from "@/components/ui/tooltip"
import { IconLoader2, IconRefresh } from "@tabler/icons-react"

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
          size="icon-sm"
          onClick={handleClick}
          disabled={isLoading || isLoadingProp}
        >
          {isLoading ? (
            <IconLoader2 className="animate-spin text-zinc-500" size={16} />
          ) : (
            <IconRefresh className="text-zinc-500 dark:text-zinc-600" size={16} />
          )}
        </Button>
      </SimpleTooltip>
    </div>
  )
}
