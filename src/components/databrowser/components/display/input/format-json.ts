const WHITESPACE = new Set([" ", "\t", "\n", "\r"])

export const checkIsValidJSON = (value: string) => {
  try {
    JSON.parse(value)
    return true
  } catch {
    return false
  }
}

/**
 * Formats valid JSON by only changing whitespace outside of strings, so numbers, escapes, and key
 * order are kept exactly as stored (unlike JSON.parse + JSON.stringify). Indent 0 compacts it.
 */
export const formatJSON = (value: string, indent = 2) => {
  // Fast path: native formatting is lossless when the value is already canonical compact JSON
  try {
    const parsed = JSON.parse(value)
    if (JSON.stringify(parsed) === value) return JSON.stringify(parsed, undefined, indent)
  } catch {
    // Falls back to the formatter below
  }
  return reformatJSON(value, indent)
}

const reformatJSON = (value: string, indent: number) => {
  const newline = (depth: number) => (indent ? "\n" + " ".repeat(indent * depth) : "")

  let result = ""
  let depth = 0

  for (let i = 0; i < value.length; i++) {
    const char = value[i]

    if (WHITESPACE.has(char)) continue

    switch (char) {
      case '"': {
        // Copy the whole string at once, skipping escaped characters
        let end = i + 1
        while (end < value.length && value[end] !== '"') end += value[end] === "\\" ? 2 : 1
        result += value.slice(i, end + 1)
        i = end
        break
      }
      case "{":
      case "[": {
        let next = i + 1
        while (WHITESPACE.has(value[next])) next++

        if (value[next] === (char === "{" ? "}" : "]")) {
          result += char + value[next]
          i = next
        } else {
          depth++
          result += char + newline(depth)
        }
        break
      }
      case "}":
      case "]": {
        depth--
        result += newline(depth) + char
        break
      }
      case ",": {
        result += "," + newline(depth)
        break
      }
      case ":": {
        result += indent ? ": " : ":"
        break
      }
      default: {
        result += char
      }
    }
  }

  return result
}

/** Stored JSON value with its formatted view, used to map editor text back to stored bytes */
export type JSONSource = { data: string; formatted: string; isCompact: boolean }

export const getJSONSource = (data: string): JSONSource | undefined => {
  let parsed: unknown
  try {
    parsed = JSON.parse(data)
  } catch {
    return
  }
  // Canonical compact JSON can be formatted natively, which is lossless for it and faster
  if (JSON.stringify(parsed) === data) {
    return { data, formatted: JSON.stringify(parsed, undefined, 2), isCompact: true }
  }
  return { data, formatted: reformatJSON(data, 2), isCompact: reformatJSON(data, 0) === data }
}

/**
 * Maps editor text to the value to store. The untouched formatted view maps back to the original
 * bytes, and edits to compact JSON are compacted again so formatting is not saved. This parses the
 * whole text, so call it when saving rather than on every change.
 */
export const toStoredValue = (text: string, source: JSONSource) => {
  if (text === source.formatted) return source.data
  if (source.isCompact && checkIsValidJSON(text)) return reformatJSON(text, 0)
  return text
}

// Per form control, the functions that map each field's editor text to the value to store
const storedValueMappers = new WeakMap<object, Map<string, (value: string) => string>>()

/** Registers how a field's form value maps to the value to store, returns the unregister function */
export const registerStoredValueMapper = (
  control: object,
  name: string,
  mapper: (value: string) => string
) => {
  let mappers = storedValueMappers.get(control)
  if (!mappers) {
    mappers = new Map()
    storedValueMappers.set(control, mappers)
  }
  mappers.set(name, mapper)
  return () => {
    if (mappers.get(name) === mapper) mappers.delete(name)
  }
}

/**
 * Maps submitted form values to the values to store. Fields edited as JSON hold the editor text
 * until then, since mapping it back to the stored format parses the whole value.
 */
export const toStoredValues = <T extends Record<string, unknown>>(
  form: { control: object },
  values: T
): T => {
  const mappers = storedValueMappers.get(form.control)
  if (!mappers) return values
  const result: Record<string, unknown> = { ...values }
  for (const [name, toStored] of mappers) {
    const value = result[name]
    if (typeof value === "string") result[name] = toStored(value)
  }
  return result as T
}
