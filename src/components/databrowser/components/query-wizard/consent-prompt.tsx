import { useDatabrowserStore } from "@/store"
import { IconAlertCircleFilled } from "@tabler/icons-react"

export const ConsentPrompt = ({ onClose }: { onClose?: () => void }) => {
  const store = useDatabrowserStore()

  const handleContinue = () => {
    store.setAiDataSharingConsent(true)
  }

  return (
    <div className="flex max-w-[500px] flex-col gap-6 rounded-2xl p-6 shadow-lg">
      {/* Header */}
      <div className="flex items-center gap-2">
        <h3 className="text-base font-semibold text-zinc-950">AI Query Builder</h3>
        <div className="flex items-center justify-center rounded-md bg-purple-100 px-1.5 py-0.5">
          <span className="text-sm font-medium text-purple-700">BETA</span>
        </div>
      </div>

      {/* Warning message */}
      <div className="flex gap-3 rounded-xl border border-yellow-300 bg-yellow-50 p-5">
        <IconAlertCircleFilled className="size-5 shrink-0 text-yellow-800" />
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-yellow-800">
            AI Query Builder requires data sharing
          </p>
          <p className="text-sm text-yellow-800">
            To generate accurate queries, we'll send your{" "}
            <span className="font-semibold">index schema</span> and a{" "}
            <span className="font-semibold">small sample of your data</span> to AI models. This may
            include field names and example values.
          </p>
          <p className="text-sm text-yellow-800">Only used to generate the query you request.</p>
        </div>
      </div>

      {/* Footer */}
      <div className="flex items-center justify-end gap-2">
        <button
          onClick={onClose}
          className="flex h-8 items-center justify-center rounded-md border border-zinc-300 bg-white px-4 text-sm text-zinc-950 hover:bg-zinc-50"
        >
          Cancel
        </button>
        <button
          onClick={handleContinue}
          className="flex h-8 items-center justify-center rounded-md bg-purple-500 px-4 text-sm text-white hover:bg-purple-600"
        >
          I agree & Continue
        </button>
      </div>
    </div>
  )
}
