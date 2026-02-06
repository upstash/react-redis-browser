import { useMemo } from "react"

import type { SearchIndex } from "@/components/databrowser/hooks/use-fetch-search-index"

import { EditorWithTypes } from "../../../common/editor-with-types"
import { generateTypeDefinitions } from "./generate-query-type-definitions"

type QueryEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: number
  schema?: SearchIndex
}

const QUERY_PREFIX = "const query: Query = {"
const QUERY_DEFAULT = "const query: Query = {}"

const isQueryStringValid = (value: string) => {
  return value.startsWith(QUERY_PREFIX) && value.endsWith("}")
}

export const QueryEditor = ({ value, onChange, height, schema }: QueryEditorProps) => {
  const typeDefinitions = useMemo(() => generateTypeDefinitions(schema), [schema])

  return (
    <EditorWithTypes
      value={value}
      onChange={onChange}
      height={height}
      typeDefinitions={typeDefinitions}
      validateValue={isQueryStringValid}
      defaultValue={QUERY_DEFAULT}
      filePath={`query-types.ts`}
      testLabel="query-editor"
    />
  )
}
