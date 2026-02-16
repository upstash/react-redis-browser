import type { SearchIndex } from "@/components/databrowser/hooks/use-fetch-search-index"

export type SampleDataItem = {
  key: string
  data: Record<string, any> | string | null
}

export type QueryWizardContext = {
  prompt: string
  searchIndex: SearchIndex | undefined
  sampleData: SampleDataItem[]
  searchTypes: string
}

export type QueryWizardResponse = {
  query: any
}

export type UseQueryWizard = (context: QueryWizardContext) => Promise<QueryWizardResponse>
