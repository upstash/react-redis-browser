/* eslint-disable unicorn/no-array-push-push */
/**
 * Schema Stringify
 * Converts API format (flat, dot-notation) to TypeScript schema builder syntax
 *
 * API format (flat, dot-notation):
 *   { "name": "TEXT", "contact.email": "TEXT" }
 *
 * Editor format (nested, readable):
 *   const schema: Schema = s.object({
 *     name: s.string(),
 *     contact: s.object({
 *       email: s.string(),
 *     }),
 *   })
 */

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
      case "KEYWORD": {
        return "s.keyword()"
      }
      case "FACET": {
        return "s.facet()"
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
    case "KEYWORD": {
      builder = "s.keyword()"
      break
    }
    case "FACET": {
      builder = "s.facet()"
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
