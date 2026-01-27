import { useMemo } from "react"

import { EditorWithTypes } from "../../../common/editor-with-types"
import { generateSchemaTypeDefinitions } from "./generate-schema-type-definitions"

type SchemaEditorProps = {
  value: string
  onChange: (value: string) => void
  height?: number
}

const SCHEMA_PREFIX = "const schema: Schema = s.object({"
const SCHEMA_SUFFIX = "})"
const SCHEMA_DEFAULT = "const schema: Schema = s.object({\n  \n})"

const isSchemaStringValid = (value: string) => {
  return value.startsWith(SCHEMA_PREFIX) && value.endsWith(SCHEMA_SUFFIX)
}

export const SchemaEditor = ({ value, onChange, height }: SchemaEditorProps) => {
  const typeDefinitions = useMemo(() => generateSchemaTypeDefinitions(), [])

  return (
    <EditorWithTypes
      value={value}
      onChange={onChange}
      height={height}
      typeDefinitions={typeDefinitions}
      validateValue={isSchemaStringValid}
      defaultValue={SCHEMA_DEFAULT}
      filePath="schema.ts"
      testLabel="schema-editor"
    />
  )
}

// Helper to extract the schema object from the editor value
export const extractSchemaFromEditorValue = (editorValue: string): string => {
  // Remove the prefix "const schema: Schema = s.object(" and suffix ")"
  const withoutPrefix = editorValue.slice(SCHEMA_PREFIX.length - 1) // Keep the opening {
  const withoutSuffix = withoutPrefix.slice(0, -1) // Remove the closing )
  return withoutSuffix
}

// Helper to create editor value from schema object string
export const createEditorValueFromSchema = (schemaObjectStr: string): string => {
  return `const schema: Schema = s.object(${schemaObjectStr})`
}

export { SCHEMA_DEFAULT }
