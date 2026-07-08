import { useState } from "react"
import { IconSparkles } from "@tabler/icons-react"

import { Button } from "@/components/ui/button"
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { QueryWizardPopover } from "./query-wizard-popover"
import { useQueryWizardFn } from "./use-query-wizard"

export const WizardButton = () => {
  const queryWizard = useQueryWizardFn()
  const [open, setOpen] = useState(false)

  if (!queryWizard) return null

  return (
    <Popover open={open} onOpenChange={setOpen} modal={false}>
      <SimpleTooltip content="Query Wizard">
        <PopoverTrigger asChild>
          <Button
            size="icon"
            aria-label="Query Wizard"
            className="h-7 w-7 border border-purple-300 bg-purple-50 hover:bg-purple-100"
          >
            <IconSparkles className="size-5 text-purple-500" />
          </Button>
        </PopoverTrigger>
      </SimpleTooltip>
      <PopoverContent side="bottom" align="end" sideOffset={6} className="w-auto p-0">
        <QueryWizardPopover onClose={() => setOpen(false)} />
      </PopoverContent>
    </Popover>
  )
}
