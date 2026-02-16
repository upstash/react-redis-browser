import { useDatabrowserStore } from "@/store"

import { Button } from "@/components/ui/button"

export const AiConsentDialog = ({ onClose }: { onClose?: () => void }) => {
  const store = useDatabrowserStore()
  const setAiDataSharingConsent = store.setAiDataSharingConsent

  const handleAllow = () => {
    setAiDataSharingConsent(true)
  }

  const handleDeny = () => {
    onClose?.()
    setTimeout(() => {
      setAiDataSharingConsent(false)
    }, 100)
  }

  return (
    <div className="flex flex-col gap-4 p-1">
      <div className="flex flex-col gap-2">
        <h3 className="text-base font-semibold text-zinc-900 dark:text-zinc-100">
          AI Query Assistant
        </h3>
        <p className="text-sm text-zinc-600 dark:text-zinc-400">
          To generate accurate queries, the AI needs access to:
        </p>
        <ul className="ml-4 list-disc space-y-1 text-sm text-zinc-600 dark:text-zinc-400">
          <li>Your index schema structure</li>
          <li>Sample data from your database (up to 10 items)</li>
        </ul>
        <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
          This data will be sent to the AI service to help generate relevant queries. Do you want to
          allow this?
        </p>
      </div>

      <div className="flex justify-end gap-2">
        <Button onClick={handleDeny} size="sm" variant="secondary">
          Don't Allow
        </Button>
        <Button onClick={handleAllow} size="sm" variant="primary">
          Allow
        </Button>
      </div>
    </div>
  )
}
