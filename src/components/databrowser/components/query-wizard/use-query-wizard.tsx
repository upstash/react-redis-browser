import { createContext, useContext } from "react"
import { useMutation } from "@tanstack/react-query"

import type { SampleDataItem, UseQueryWizard } from "@/types/query-wizard"

import type { SearchIndex } from "../../hooks/use-fetch-search-index"
import { SEARCH_TYPES } from "../search/search-types-file"

const QueryWizardContext = createContext<UseQueryWizard | undefined>(undefined)

export const QueryWizardProvider = QueryWizardContext.Provider

export const useQueryWizardFn = () => {
  return useContext(QueryWizardContext)
}

export const useGenerateQuery = () => {
  const queryWizard = useQueryWizardFn()

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
