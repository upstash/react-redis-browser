import { useDatabrowserStore } from "@/store"

import { Button } from "@/components/ui/button"

export const AiAccessRequired = ({ onClose }: { onClose?: () => void }) => {
  const store = useDatabrowserStore()
  const setAiDataSharingConsent = store.setAiDataSharingConsent

  const handleGrantAccess = () => {
    setAiDataSharingConsent(true)
  }

  return (
    <div className="flex flex-col items-center gap-4 p-4 text-center">
      <div className="flex h-12 w-12 items-center justify-center rounded-full bg-amber-100 dark:bg-amber-950">
        <span className="text-2xl">🔒</span>
      </div>
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          Access Required
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          The AI Query Assistant needs permission to access your schema and sample data to generate
          queries.
        </p>
      </div>

      <div className="flex w-full flex-col gap-2">
        <Button onClick={handleGrantAccess} size="sm" variant="primary" className="w-full">
          Grant Access
        </Button>
        <Button onClick={onClose} size="sm" variant="secondary" className="w-full">
          Cancel
        </Button>
      </div>
    </div>
  )
}
