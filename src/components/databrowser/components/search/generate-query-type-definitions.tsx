import type { SearchIndex } from "@/components/databrowser/hooks/use-fetch-search-index"

import { SEARCH_TYPES } from "./search-types-file"

type NestedSchema = { [key: string]: string | NestedSchema }

// Builds a nested object from flat dot-notation keys
// e.g. { "contact.email": "TEXT", name: "TEXT" } => { contact: { email: "TEXT" }, name: "TEXT" }
const buildNestedSchema = (flatSchema: Record<string, { type: string }>): NestedSchema => {
  const nested: NestedSchema = {}

  for (const [fieldPath, fieldDef] of Object.entries(flatSchema)) {
    const parts = fieldPath.split(".")
    let current = nested

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part] || typeof current[part] === "string") {
        current[part] = {}
      }
      current = current[part] as NestedSchema
    }

    current[parts.at(-1)!] = `"${fieldDef.type}"`
  }

  return nested
}

const generateNestedInterface = (obj: NestedSchema, indent = "  "): string => {
  const lines: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (typeof value === "string") {
      lines.push(`${indent}${key}: ${value};`)
    } else {
      lines.push(`${indent}${key}: {`, generateNestedInterface(value, indent + "  "), `${indent}};`)
    }
  }

  return lines.join("\n")
}

// Strip `export` keywords so Monaco treats the type definitions as
// ambient/global declarations instead of a module (which would make
// non-exported types like Query invisible to the editor file).
// Also convert `export const X = ...` to `declare const X: ...` for
// value declarations that can't appear in ambient context.
const toAmbientTypes = (types: string): string =>
  types
    .replaceAll(/export const (\w+) = (\[.*?]) as const;/g, "declare const $1: readonly $2;")
    .replaceAll("export ", "")

/** Generates the typescript types to be used in the query editor */
export const generateTypeDefinitions = (schema?: SearchIndex): string => {
  let schemaFieldsInterface = ""

  const schemaFields = schema?.schema
  if (schemaFields && Object.keys(schemaFields).length > 0) {
    const nested = buildNestedSchema(schemaFields)
    const fieldLines = generateNestedInterface(nested)

    schemaFieldsInterface = `
/** Schema fields for the current index */
interface SchemaFields {
${fieldLines}
}`
  } else {
    schemaFieldsInterface = `
/** Schema fields - no schema available, using dynamic fields */
interface SchemaFields {
  [fieldName: string]: FieldType | DetailedField | NestedIndexSchema;
}`
  }

  return `
${toAmbientTypes(SEARCH_TYPES)}

${schemaFieldsInterface}

type Query = RootQueryFilter<SchemaFields>;
`
}
