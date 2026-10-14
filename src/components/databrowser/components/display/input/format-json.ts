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

  const newline = (depth: number) => (indent ? "\n" + " ".repeat(indent * depth) : "")

  let result = ""
  let depth = 0
  let inString = false

  for (let i = 0; i < value.length; i++) {
    const char = value[i]

    if (inString) {
      result += char
      if (char === "\\") {
        i++
        result += value[i]
      } else if (char === '"') {
        inString = false
      }
      continue
    }

    if (WHITESPACE.has(char)) continue

    switch (char) {
      case '"': {
        inString = true
        result += char
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
  if (!checkIsValidJSON(data)) return
  return { data, formatted: formatJSON(data), isCompact: formatJSON(data, 0) === data }
}

/**
 * Maps editor text to the value to store. The untouched formatted view maps back to the original
 * bytes, and edits to compact JSON are compacted again so formatting is not saved.
 */
export const toStoredValue = (text: string, source: JSONSource) => {
  if (text === source.formatted) return source.data
  if (source.isCompact && checkIsValidJSON(text)) return formatJSON(text, 0)
  return text
}
