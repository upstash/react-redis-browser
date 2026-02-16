import { useMutation } from "@tanstack/react-query"

import type { SampleDataItem, UseQueryWizard } from "@/types/query-wizard"

import { SEARCH_TYPES } from "../components/search/search-types-file"
import type { SearchIndex } from "./use-fetch-search-index"

export const useGenerateQuery = (queryWizard?: UseQueryWizard) => {
  return useMutation({
    mutationFn: async ({
      prompt,
      searchIndex,
      sampleData,
    }: {
      prompt: string
      searchIndex: SearchIndex | undefined
      sampleData: SampleDataItem[]
    }): Promise<{ query: any }> => {
      if (!queryWizard) {
        throw new Error(
          "Query Wizard is not configured. Please provide a useQueryWizard prop to RedisBrowser component."
        )
      }
      const result = await queryWizard({
        prompt,
        searchIndex,
        sampleData,
        searchTypes: SEARCH_TYPES,
      })

      return result
    },
  })
}
