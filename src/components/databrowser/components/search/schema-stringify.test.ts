import { describe, expect, test } from "bun:test"

import { schemaToEditorValue } from "./schema-stringify"

describe("schemaToEditorValue", () => {
  test("converts simple flat schema", () => {
    const input = { name: "TEXT", age: "F64" }
    const result = schemaToEditorValue(input)
    expect(result).toContain("s.object({")
    expect(result).toContain("name: s.string()")
    expect(result).toContain('age: s.number("F64")')
  })

  test("converts number with from modifier", () => {
    const input = { price: { type: "F64", from: "amount" } }
    const result = schemaToEditorValue(input)
    expect(result).toContain('price: s.number("F64").from("amount")')
  })

  test("converts nested schema with proper indentation", () => {
    const input = {
      "user.name": "TEXT",
      "user.email": "TEXT",
    }
    const result = schemaToEditorValue(input)
    expect(result).toContain("user: s.object({")
    expect(result).toContain("name: s.string()")
    expect(result).toContain("email: s.string()")
  })

  test("converts all simple types correctly", () => {
    const input = {
      text: "TEXT",
      bool: "BOOL",
      date: "DATE",
      u64: "U64",
      i64: "I64",
      f64: "F64",
    }
    const result = schemaToEditorValue(input)
    expect(result).toContain("text: s.string()")
    expect(result).toContain("bool: s.boolean()")
    expect(result).toContain("date: s.date()")
    expect(result).toContain('u64: s.number("U64")')
    expect(result).toContain('i64: s.number("I64")')
    expect(result).toContain('f64: s.number("F64")')
  })

  test("converts object types with modifiers", () => {
    const input = {
      a: { type: "TEXT", noTokenize: true },
      b: { type: "TEXT", noStem: true },
      c: { type: "TEXT", from: "source" },
      d: { type: "BOOL", fast: true },
      e: { type: "DATE", fast: true },
    }
    const result = schemaToEditorValue(input)
    expect(result).toContain("a: s.string().noTokenize()")
    expect(result).toContain("b: s.string().noStem()")
    expect(result).toContain('c: s.string().from("source")')
    expect(result).toContain("d: s.boolean().fast()")
    expect(result).toContain("e: s.date().fast()")
  })

  test("converts empty schema", () => {
    const input = {}
    const result = schemaToEditorValue(input)
    // Empty schema has a newline inside the braces from renderObject
    expect(result).toBe("const schema: Schema = s.object({\n\n})")
  })

  test("handles unknown type by defaulting to string", () => {
    const input = { field: "UNKNOWN_TYPE" }
    const result = schemaToEditorValue(input)
    expect(result).toContain("field: s.string()")
  })
})
