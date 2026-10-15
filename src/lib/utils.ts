import { clsx, type ClassValue } from "clsx"
import { twMerge } from "tailwind-merge"

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function safeParseJSON<T>(value: string): T | undefined {
  try {
    return JSON.parse(value)
  } catch {
    return
  }
}

/** Index of the next character that is not whitespace or a comment */
const skipWhitespaceAndComments = (value: string, index: number): number => {
  while (index < value.length) {
    if (/\s/.test(value[index])) {
      index++
    } else if (value.startsWith("//", index)) {
      const end = value.indexOf("\n", index)
      index = end === -1 ? value.length : end + 1
    } else if (value.startsWith("/*", index)) {
      const end = value.indexOf("*/", index + 2)
      index = end === -1 ? value.length : end + 2
    } else {
      break
    }
  }
  return index
}

/**
 * Parses a JavaScript object literal string into a JS object.
 * Supports unquoted keys like `$and:`, single quoted strings, comments, and trailing commas.
 * String contents are never rewritten. Returns undefined if the value is not valid.
 */
export function parseJSObjectLiteral<T>(value: string): T | undefined {
  let json = ""
  let index = 0

  while (index < value.length) {
    const char = value[index]

    if (char === '"' || char === "'") {
      // Copy the string as a double quoted JSON string
      let content = ""
      index++
      while (index < value.length && value[index] !== char) {
        if (value[index] === "\\") {
          const escaped = value[index + 1] ?? ""
          // \' is valid JS in any string but not JSON
          content += escaped === "'" ? "'" : `\\${escaped}`
          index += 2
        } else {
          content += value[index] === '"' ? String.raw`\"` : value[index]
          index++
        }
      }
      if (index >= value.length) return
      index++
      json += `"${content}"`
      continue
    }

    const next = skipWhitespaceAndComments(value, index)
    if (next !== index) {
      json += " "
      index = next
      continue
    }

    const identifier = /^[$A-Z_a-z][\w$]*/.exec(value.slice(index))?.[0]
    if (identifier) {
      index += identifier.length
      // An identifier followed by a colon is an unquoted key
      json +=
        value[skipWhitespaceAndComments(value, index)] === ":" ? `"${identifier}"` : identifier
      continue
    }

    // Drop trailing commas before closing braces/brackets (valid in JS, invalid in JSON),
    // but not a lone comma like {,} which is invalid in JS too
    if (char === ",") {
      const after = value[skipWhitespaceAndComments(value, index + 1)]
      const before = json.trimEnd().at(-1)
      if ((after === "}" || after === "]") && before !== "{" && before !== "[" && before !== ",") {
        index++
        continue
      }
    }

    json += char
    index++
  }

  return safeParseJSON(json)
}

const units = {
  year: 24 * 60 * 60 * 1000 * 365,
  month: (24 * 60 * 60 * 1000 * 365) / 12,
  day: 24 * 60 * 60 * 1000,
  hour: 60 * 60 * 1000,
  min: 60 * 1000,
  second: 1000,
} as const

// 2h 10m, 1d 2h, 1 year 2 months, 3 years 4 months etc.
export function formatTime(seconds: number) {
  let milliseconds = seconds * 1000
  const parts = []

  for (const [unit, value] of Object.entries(units)) {
    if (milliseconds >= value) {
      const amount = Math.floor(milliseconds / value)
      const plural = amount > 1 ? "s" : ""
      const label =
        unit === "month" ? ` month${plural}` : unit === "year" ? ` year${plural}` : unit[0]
      parts.push(`${amount}${label}`)
      milliseconds %= value
    }
  }

  // If no parts (e.g., 0ms), default to "0s"
  if (parts.length === 0) {
    parts.push("0s")
  }

  return parts.slice(0, 2).join(" ")
}

export const isTest = typeof window !== "undefined" && (window as any).__PLAYWRIGHT__ === true

/**
 * Convert JSON string to JS object literal string.
 * Removes quotes from keys that are valid identifiers.
 */
const jsonToJsLiteral = (json: string): string => {
  return json.replaceAll(/"([$A-Z_a-z][\w$]*)"\s*:/g, "$1:")
}

const MAX_INLINE_KEYS = 2

/**
 * Check if a value is simple enough to inline (primitive or small object/array with no nesting).
 */
const isInlineable = (value: unknown): boolean => {
  if (typeof value !== "object" || value === null) return true
  if (Array.isArray(value)) return value.every((v) => typeof v !== "object" || v === null)
  const entries = Object.entries(value as Record<string, unknown>)
  return (
    entries.length <= MAX_INLINE_KEYS &&
    entries.every(([, v]) => typeof v !== "object" || v === null)
  )
}

/**
 * Pretty-print a JS value, collapsing short objects (max 2 keys, no nested objects) to single lines.
 */
const prettyPrint = (value: unknown, indent: number): string => {
  if (value === undefined || value === null) return String(value)
  if (typeof value !== "object") return JSON.stringify(value)

  const prefix = "  ".repeat(indent)
  const childPrefix = "  ".repeat(indent + 1)

  if (Array.isArray(value)) {
    if (value.length === 0) return "[]"
    if (value.every((v) => isInlineable(v))) {
      const inline = `[${value.map((v) => prettyPrint(v, 0)).join(", ")}]`
      if (!inline.includes("\n")) return inline
    }
    const items = value.map((v) => `${childPrefix}${prettyPrint(v, indent + 1)}`)
    return `[\n${items.join(",\n")}\n${prefix}]`
  }

  const entries = Object.entries(value as Record<string, unknown>)
  if (entries.length === 0) return "{}"
  if (
    indent > 0 &&
    entries.length <= MAX_INLINE_KEYS &&
    entries.every(([, v]) => isInlineable(v))
  ) {
    const inline = `{ ${entries.map(([k, v]) => `${JSON.stringify(k)}: ${prettyPrint(v, 0)}`).join(", ")} }`
    if (!inline.includes("\n")) return inline
  }
  const parts = entries.map(
    ([k, v]) => `${childPrefix}${JSON.stringify(k)}: ${prettyPrint(v, indent + 1)}`
  )
  return `{\n${parts.join(",\n")}\n${prefix}}`
}

/**
 * Stringify with pretty formatting, then convert to JS literal.
 * Short objects/arrays are collapsed to single lines for readability.
 */
export const toJsLiteral = (obj: unknown): string => {
  return jsonToJsLiteral(prettyPrint(obj, 0))
}

/**
 * Formats an UpstashError message by stripping the "ERR" and "command was: ..." parts.
 */
export const formatUpstashErrorMessage = (error: Error): string => {
  if (error.name !== "UpstashError") return error.message
  let message = error.message

  // Strip "ERR " prefix
  if (message.startsWith("ERR ")) message = message.slice(4)

  // Strip "command was: [...]" suffix
  const commandIndex = message.indexOf(", command was:")
  if (commandIndex !== -1) message = message.slice(0, commandIndex)

  return message
}
