const INDENT = "  "

/**
 * Pretty-prints valid JSON by only changing whitespace outside of strings, so numbers, escapes,
 * and key order are kept exactly as stored (unlike JSON.parse + JSON.stringify).
 */
export const formatJSON = (value: string) => {
  let result = ""
  let depth = 0
  let inString = false

  const nextChar = (from: number) => value.slice(from).trimStart()[0]

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

    switch (char) {
      case " ":
      case "\t":
      case "\n":
      case "\r": {
        break
      }
      case '"': {
        inString = true
        result += char
        break
      }
      case "{":
      case "[": {
        const close = char === "{" ? "}" : "]"
        if (nextChar(i + 1) === close) {
          result += char + close
          i = value.indexOf(close, i + 1)
        } else {
          depth++
          result += char + "\n" + INDENT.repeat(depth)
        }
        break
      }
      case "}":
      case "]": {
        depth--
        result += "\n" + INDENT.repeat(depth) + char
        break
      }
      case ",": {
        result += ",\n" + INDENT.repeat(depth)
        break
      }
      case ":": {
        result += ": "
        break
      }
      default: {
        result += char
      }
    }
  }

  return result
}
