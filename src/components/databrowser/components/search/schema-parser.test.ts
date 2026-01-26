import { describe, expect, test } from "bun:test"

import { parseSchemaFromEditorValue } from "./schema-parser"

describe("Schema Parser", () => {
  test("parses basic string field", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
      },
    })
  })

  test("parses string field with options", () => {
    const input = `
      const schema: Schema = s.object({
        title: s.string().noTokenize(),
        slug: s.string().noStem(),
        author: s.string().from("writer"),
        complex: s.string().noTokenize().noStem().from("blob"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        title: { type: "TEXT", noTokenize: true },
        slug: { type: "TEXT", noStem: true },
        author: { type: "TEXT", from: "writer" },
        complex: { type: "TEXT", noTokenize: true, noStem: true, from: "blob" },
      },
    })
  })

  test("parses number fields", () => {
    const input = `
      const schema: Schema = s.object({
        price: s.number(),
        count: s.number("U64"),
        score: s.number("I64").from("val"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        price: { type: "F64", fast: true },
        count: { type: "U64", fast: true },
        score: { type: "I64", fast: true, from: "val" },
      },
    })
  })

  test("parses boolean fields", () => {
    const input = `
      const schema: Schema = s.object({
        isActive: s.boolean(),
        isAdmin: s.boolean().fast(),
        isDeleted: s.boolean().from("del"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        isActive: "BOOL",
        isAdmin: { type: "BOOL", fast: true },
        isDeleted: { type: "BOOL", from: "del" },
      },
    })
  })

  test("parses date fields", () => {
    const input = `
      const schema: Schema = s.object({
        created: s.date(),
        updated: s.date().fast(),
        deleted: s.date().from("del_at"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        created: "DATE",
        updated: { type: "DATE", fast: true },
        deleted: { type: "DATE", from: "del_at" },
      },
    })
  })

  test("parses nested objects", () => {
    const input = `
      const schema: Schema = s.object({
        user: s.object({
          name: s.string(),
          address: s.object({
            city: s.string(),
            zip: s.number("U64"),
          }),
        }),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        "user.name": "TEXT",
        "user.address.city": "TEXT",
        "user.address.zip": { type: "U64", fast: true },
      },
    })
  })

  test("handles mixed quotes and trailing commas", () => {
    const input = `
      const schema: Schema = s.object({
        'name': s.string(),
        "age": s.number(),
        active: s.boolean(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: { type: "F64", fast: true },
        active: "BOOL",
      },
    })
  })

  test("returns error for invalid format", () => {
    const input = `
      const schema = s.string()
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: false,
      error: "Invalid format. Expected s.object({ ... })",
    })
  })
})
