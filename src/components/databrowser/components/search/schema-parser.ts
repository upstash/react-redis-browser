/* eslint-disable unicorn/no-array-push-push */
/**
 * Schema Parser
 * Converts between TypeScript schema builder syntax and API format
 *
 * Editor format (nested, readable):
 *   const schema: Schema = s.object({
 *     name: s.string(),
 *     contact: s.object({
 *       email: s.string(),
 *     }),
 *   })
 *
 * API format (flat, dot-notation):
 *   { "name": "TEXT", "contact.email": "TEXT" }
 */

// Field value types for the API
type FieldValue =
  | string // "TEXT", "BOOL", "DATE", "U64", "I64", "F64"
  | {
      type: string
      noTokenize?: boolean
      noStem?: boolean
      fast?: boolean
      from?: string
    }

type FlatSchema = Record<string, FieldValue>

type ParseResult = { success: true; schema: FlatSchema } | { success: false; error: string }

// ============================================================================
// PARSE: Editor -> API (flat)
// ============================================================================

export function parseSchemaFromEditorValue(editorValue: string): ParseResult {
  try {
    // Extract content inside s.object({ ... })
    const rootMatch = editorValue.match(/s\.object\s*\(\s*{([\S\s]*)}\s*\)/)
    if (!rootMatch) {
      return { success: false, error: "Invalid format. Expected s.object({ ... })" }
    }

    const flatSchema: FlatSchema = {}
    parseFields(rootMatch[1], "", flatSchema)

    return { success: true, schema: flatSchema }
  } catch (error) {
    return { success: false, error: error instanceof Error ? error.message : "Parse error" }
  }
}

/**
 * Parse field definitions and add to flatSchema with dot-notation keys
 */
function parseFields(content: string, prefix: string, flatSchema: FlatSchema): void {
  // Tokenize into field entries
  const entries = splitEntries(content)

  for (const entry of entries) {
    const colonIndex = findColonIndex(entry)
    if (colonIndex === -1) continue

    // Extract field name (handle quoted names)
    let fieldName = entry.slice(0, colonIndex).trim()
    if (
      (fieldName.startsWith('"') && fieldName.endsWith('"')) ||
      (fieldName.startsWith("'") && fieldName.endsWith("'"))
    ) {
      fieldName = fieldName.slice(1, -1)
    }

    const valueStr = entry.slice(colonIndex + 1).trim()
    const fullKey = prefix ? `${prefix}.${fieldName}` : fieldName

    // Check if it's a nested s.object()
    if (valueStr.startsWith("s.object(")) {
      const nestedContent = extractObjectContent(valueStr)
      if (nestedContent !== null) {
        parseFields(nestedContent, fullKey, flatSchema)
        continue
      }
    }

    // Parse the field builder (s.string(), s.number(), etc.)
    const fieldValue = parseFieldBuilder(valueStr)
    if (fieldValue) {
      flatSchema[fullKey] = fieldValue
    }
  }
}

/**
 * Split content by top-level commas (respects nesting)
 */
function splitEntries(content: string): string[] {
  const entries: string[] = []
  let current = ""
  let depth = 0
  let inString = false
  let stringChar = ""

  for (let i = 0; i < content.length; i++) {
    const char = content[i]
    const prev = content[i - 1]

    // Track string state
    if ((char === '"' || char === "'") && prev !== "\\") {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString) {
      if (char === "(" || char === "{" || char === "[") depth++
      if (char === ")" || char === "}" || char === "]") depth--

      if (char === "," && depth === 0) {
        const trimmed = current.trim()
        if (trimmed) entries.push(trimmed)
        current = ""
        continue
      }
    }

    current += char
  }

  const trimmed = current.trim()
  if (trimmed) entries.push(trimmed)

  return entries
}

/**
 * Find the colon separating field name from value (respects strings)
 */
function findColonIndex(entry: string): number {
  let inString = false
  let stringChar = ""

  for (let i = 0; i < entry.length; i++) {
    const char = entry[i]
    const prev = entry[i - 1]

    if ((char === '"' || char === "'") && prev !== "\\") {
      if (!inString) {
        inString = true
        stringChar = char
      } else if (char === stringChar) {
        inString = false
      }
    }

    if (!inString && char === ":") {
      return i
    }
  }

  return -1
}

/**
 * Extract content from s.object({ ... })
 */
function extractObjectContent(str: string): string | null {
  const match = str.match(/^s\.object\s*\(\s*{([\S\s]*)}\s*\)/)
  return match ? match[1] : null
}

/**
 * Parse a field builder like s.string().noTokenize()
 */
function parseFieldBuilder(str: string): FieldValue | null {
  str = str.trim().replace(/,\s*$/, "")

  // s.string()
  if (str.startsWith("s.string()")) {
    const noTokenize = str.includes(".noTokenize()")
    const noStem = str.includes(".noStem()")
    const fromMatch = str.match(/\.from\(["']([^"']+)["']\)/)

    if (!noTokenize && !noStem && !fromMatch) return "TEXT"

    return {
      type: "TEXT",
      ...(noTokenize && { noTokenize: true }),
      ...(noStem && { noStem: true }),
      ...(fromMatch && { from: fromMatch[1] }),
    }
  }

  // s.number() or s.number("F64")
  if (str.startsWith("s.number(")) {
    const typeMatch = str.match(/s\.number\(\s*["']?(U64|I64|F64)?["']?\s*\)/)
    const numType = typeMatch?.[1] || "F64"
    const fromMatch = str.match(/\.from\(["']([^"']+)["']\)/)

    if (!fromMatch) return { type: numType, fast: true }

    return { type: numType, fast: true, from: fromMatch[1] }
  }

  // s.boolean()
  if (str.startsWith("s.boolean()")) {
    const fast = str.includes(".fast()")
    const fromMatch = str.match(/\.from\(["']([^"']+)["']\)/)

    if (!fast && !fromMatch) return "BOOL"

    return {
      type: "BOOL",
      ...(fast && { fast: true }),
      ...(fromMatch && { from: fromMatch[1] }),
    }
  }

  // s.date()
  if (str.startsWith("s.date()")) {
    const fast = str.includes(".fast()")
    const fromMatch = str.match(/\.from\(["']([^"']+)["']\)/)

    if (!fast && !fromMatch) return "DATE"

    return {
      type: "DATE",
      ...(fast && { fast: true }),
      ...(fromMatch && { from: fromMatch[1] }),
    }
  }

  return null
}

// ============================================================================
// CONVERT: API (flat) -> Editor (nested)
// ============================================================================

/**
 * Convert flat API schema to editor TypeScript format
 */
export function schemaToEditorValue(flatSchema: Record<string, unknown>): string {
  const nested = unflattenSchema(flatSchema)
  const body = renderObject(nested, 1)
  return `const schema: Schema = s.object({\n${body}})`
}

/**
 * Convert flat dot-notation keys to nested structure
 */
function unflattenSchema(flat: Record<string, unknown>): Record<string, unknown> {
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(flat)) {
    const parts = key.split(".")
    let current = result

    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i]
      if (!current[part] || typeof current[part] !== "object") {
        current[part] = {}
      }
      current = current[part] as Record<string, unknown>
    }

    current[parts.at(-1)!] = value
  }

  return result
}

/**
 * Render nested schema object to TypeScript code
 */
function renderObject(obj: Record<string, unknown>, indent: number): string {
  const pad = "  ".repeat(indent)
  const lines: string[] = []

  for (const [key, value] of Object.entries(obj)) {
    if (isFieldValue(value)) {
      lines.push(`${pad}${key}: ${fieldToBuilder(value)},`)
    } else {
      // Nested object
      const nested = renderObject(value as Record<string, unknown>, indent + 1)
      lines.push(`${pad}${key}: s.object({`)
      lines.push(nested.trimEnd())
      lines.push(`${pad}}),`)
    }
  }

  return lines.join("\n") + "\n"
}

/**
 * Check if value is a field definition vs nested object
 */
function isFieldValue(value: unknown): boolean {
  if (typeof value === "string") return true
  if (typeof value === "object" && value !== null) {
    return "type" in value
  }
  return false
}

/**
 * Convert field value to builder syntax
 */
function fieldToBuilder(value: unknown): string {
  // Simple string types
  if (typeof value === "string") {
    switch (value) {
      case "TEXT": {
        return "s.string()"
      }
      case "BOOL": {
        return "s.boolean()"
      }
      case "DATE": {
        return "s.date()"
      }
      case "U64":
      case "I64":
      case "F64": {
        return `s.number("${value}")`
      }
      default: {
        return "s.string()"
      }
    }
  }

  // Object with options
  const v = value as Record<string, unknown>
  const type = v.type as string
  let builder = ""

  switch (type) {
    case "TEXT": {
      builder = "s.string()"
      if (v.noTokenize) builder += ".noTokenize()"
      if (v.noStem) builder += ".noStem()"
      break
    }
    case "U64":
    case "I64":
    case "F64": {
      builder = `s.number("${type}")`
      break
    }
    case "BOOL": {
      builder = "s.boolean()"
      if (v.fast) builder += ".fast()"
      break
    }
    case "DATE": {
      builder = "s.date()"
      if (v.fast) builder += ".fast()"
      break
    }
    default: {
      builder = "s.string()"
    }
  }

  if (v.from) {
    builder += `.from("${v.from}")`
  }

  return builder
}
