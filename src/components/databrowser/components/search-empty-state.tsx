import { useState } from "react"
import { IconCode, IconDatabase, IconDownload, IconSearch } from "@tabler/icons-react"

import { ImportSampleDatasetModal } from "./import-sample-dataset-modal"

export const SearchEmptyState = () => {
  const [importModalOpen, setImportModalOpen] = useState(false)

  return (
    <div className="flex flex-1 justify-center">
      <div className="flex gap-8 rounded-xl border border-zinc-200 bg-gradient-to-b from-zinc-50 to-white p-8">
        {/* Left side - Explanation */}
        <div className="flex-1">
          <h2 className="mb-2 text-lg font-semibold text-zinc-900">Redis Search</h2>

          <p className="mb-6 max-w-md text-sm leading-relaxed text-zinc-600">
            Redis Search allows you to create indexes on your existing keys and perform fast,
            full-text searches across your data.
          </p>

          <div className="space-y-3">
            <h3 className="text-xs font-medium uppercase tracking-wider text-zinc-400">
              How it works
            </h3>

            <div className="space-y-2.5">
              {/* Step 1 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <IconDatabase size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-900">Store your data</h4>
                  <p className="text-sm text-zinc-500">
                    Add documents as JSON, Hash, or String keys (string content must be valid JSON).
                  </p>
                </div>
              </div>

              {/* Step 2 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <IconCode size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-900">Create an index</h4>
                  <p className="text-sm text-zinc-500">
                    Define a search index specifying which fields to search on.
                  </p>
                </div>
              </div>

              {/* Step 3 */}
              <div className="flex items-start gap-3">
                <div className="flex h-7 w-7 shrink-0 items-center justify-center rounded-md bg-emerald-100 text-emerald-600">
                  <IconSearch size={16} />
                </div>
                <div>
                  <h4 className="text-sm font-medium text-zinc-900">Search your data</h4>
                  <p className="text-sm text-zinc-500">
                    Query with filters, full-text search, and sorted results.
                  </p>
                </div>
              </div>
            </div>
          </div>

          <a
            href="https://upstash-search.mintlify.app/redis/search/introduction"
            target="_blank"
            rel="noopener noreferrer"
            className="mt-5 inline-block text-sm text-emerald-600 underline-offset-2 hover:underline"
          >
            Learn more →
          </a>
        </div>

        {/* Right side - Import action */}
        <div className="flex w-72 flex-col items-center justify-center rounded-lg border border-dashed border-zinc-300 bg-white p-6">
          <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-zinc-100 text-zinc-500">
            <IconDownload size={24} />
          </div>
          <h3 className="mb-1 text-sm font-medium text-zinc-900">Get started quickly</h3>
          <p className="mb-4 text-center text-xs text-zinc-500">
            Import a sample dataset to try out Redis Search
          </p>
          <button
            onClick={() => setImportModalOpen(true)}
            className="rounded-lg bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition-colors hover:bg-zinc-800"
          >
            Import a sample dataset
          </button>
        </div>
      </div>

      <ImportSampleDatasetModal open={importModalOpen} onOpenChange={setImportModalOpen} />
    </div>
  )
}
