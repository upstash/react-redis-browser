import { describe, expect, test } from "bun:test"

import { parseSchemaFromEditorValue } from "./schema-parser"
import { schemaToEditorValue } from "./schema-stringify"

describe("Schema Parser - Round Trip", () => {
  test("round-trips simple schema", () => {
    const original = {
      name: "TEXT",
      age: { type: "F64", fast: true },
      active: "BOOL",
    }
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })

  test("round-trips nested schema", () => {
    const original = {
      "user.name": "TEXT",
      "user.address.city": "TEXT",
      "user.address.zip": { type: "U64", fast: true },
    }
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })

  test("round-trips schema with all field types", () => {
    const original = {
      text: "TEXT",
      textWithOptions: { type: "TEXT", noTokenize: true, noStem: true },
      bool: "BOOL",
      boolFast: { type: "BOOL", fast: true },
      date: "DATE",
      dateFast: { type: "DATE", fast: true },
      f64: { type: "F64", fast: true },
      f64From: { type: "F64", fast: true, from: "source" },
      u64: { type: "U64", fast: true },
      i64: { type: "I64", fast: true },
    }
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })

  test("round-trips schema with from() fields", () => {
    const original = {
      name: { type: "TEXT", from: "fullName" },
      count: { type: "U64", fast: true, from: "total" },
      active: { type: "BOOL", fast: true, from: "isActive" },
    }
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })

  test("round-trips empty schema", () => {
    const original = {}
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })

  test("round-trips deeply nested schema", () => {
    const original = {
      "a.b.c.d.e": "TEXT",
      "a.b.c.d.f": { type: "F64", fast: true },
      "a.b.x": "BOOL",
    }
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })

  test("round-trips schema with all modifiers", () => {
    const original = {
      text1: { type: "TEXT", noTokenize: true },
      text2: { type: "TEXT", noStem: true },
      text3: { type: "TEXT", noTokenize: true, noStem: true, from: "source" },
      bool: { type: "BOOL", fast: true, from: "flag" },
      date: { type: "DATE", fast: true, from: "timestamp" },
    }
    const editorValue = schemaToEditorValue(original)
    const result = parseSchemaFromEditorValue(editorValue)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema).toEqual(original)
    }
  })
})
