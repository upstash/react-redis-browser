import { useRedis } from "@/redis-context"
import { useMutation } from "@tanstack/react-query"

import { queryClient } from "@/lib/clients"

import { parseSchemaFromEditorValue } from "../components/search/schema-parser"
import { FETCH_SEARCH_INDEX_QUERY_KEY } from "./use-fetch-search-index"
import { FETCH_SEARCH_INDEXES_QUERY_KEY } from "./use-fetch-search-indexes"

export const useUpsertSearchIndexSchema = () => {
  const { redisNoPipeline: redis } = useRedis()

  return useMutation({
    meta: { hideToast: true },
    mutationFn: async ({
      indexName,
      editorValue,
      dataType,
      prefixes,
      language,
    }: {
      indexName: string

      // Will be parsed into a schema
      editorValue: string
      dataType: string
      prefixes: string
      language: string
    }) => {
      if (!indexName) throw new Error("Index name is required")

      // Parse the schema from editor value
      const result = parseSchemaFromEditorValue(editorValue)
      if (!result.success) throw new Error(result.error)

      // Drop the existing index
      await redis.search.index({ name: indexName }).drop()

      // Recreate with the new schema but same settings

      await redis.search.createIndex({
        name: indexName,
        dataType: dataType as any,
        prefix: prefixes
          .split(",")
          .map((p) => p.trim())
          .filter(Boolean),
        language: language as any,
        schema: result.schema as any,
      })
    },
    onSuccess: (_, { indexName }) => {
      // Invalidate and refetch the index details
      queryClient.invalidateQueries({
        queryKey: [FETCH_SEARCH_INDEX_QUERY_KEY, indexName],
      })
      // Also invalidate the indexes list in case anything changed
      queryClient.invalidateQueries({
        queryKey: [FETCH_SEARCH_INDEXES_QUERY_KEY],
      })
    },
  })
}
