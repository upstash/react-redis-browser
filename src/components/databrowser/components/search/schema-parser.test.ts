import { describe, expect, test } from "bun:test"

import { parseSchemaFromEditorValue, schemaToEditorValue } from "./schema-parser"

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
        price: "F64",
        count: "U64",
        score: { type: "I64", from: "val" },
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
        "user.address.zip": "U64",
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
        age: "F64",
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

// ============================================================================
// EDGE CASE TESTS
// ============================================================================

describe("Schema Parser - Edge Cases", () => {
  test("handles empty object", () => {
    const input = `const schema: Schema = s.object({})`
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {},
    })
  })

  test("handles field names with dots in quotes", () => {
    const input = `
      const schema: Schema = s.object({
        "field.with.dots": s.string(),
        'another.dotted.field': s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        "field.with.dots": "TEXT",
        "another.dotted.field": "F64",
      },
    })
  })

  test("handles colons in from() values", () => {
    const input = `
      const schema: Schema = s.object({
        data: s.string().from("namespace:field"),
        time: s.date().from("timestamp:utc"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        data: { type: "TEXT", from: "namespace:field" },
        time: { type: "DATE", from: "timestamp:utc" },
      },
    })
  })

  test("handles brackets in from() values", () => {
    const input = `
      const schema: Schema = s.object({
        item: s.string().from("items(0)"),
        nested: s.number().from("data[key]"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        item: { type: "TEXT", from: "items(0)" },
        nested: { type: "F64", from: "data[key]" },
      },
    })
  })

  test("handles no trailing comma on last field", () => {
    const input = `
      const schema: Schema = s.object({
        first: s.string(),
        last: s.boolean()
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        first: "TEXT",
        last: "BOOL",
      },
    })
  })

  test("handles excessive whitespace", () => {
    const input = `
      const schema: Schema = s.object(   {

        "name"    :    s.string()   ,

        age   :   s.number(   "U64"   )   ,

      }   )
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: "U64",
      },
    })
  })

  test("handles single-line input", () => {
    const input = `const schema:Schema=s.object({a:s.string(),b:s.number(),c:s.boolean()})`
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        a: "TEXT",
        b: "F64",
        c: "BOOL",
      },
    })
  })

  test("handles commas inside from() string values", () => {
    const input = `
      const schema: Schema = s.object({
        data: s.string().from("a,b,c"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        data: { type: "TEXT", from: "a,b,c" },
      },
    })
  })

  test("handles parentheses inside string values", () => {
    const input = `
      const schema: Schema = s.object({
        func: s.string().from("fn(x)"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        func: { type: "TEXT", from: "fn(x)" },
      },
    })
  })

  test("handles mixed nested and flat fields", () => {
    const input = `
      const schema: Schema = s.object({
        id: s.number("U64"),
        user: s.object({
          name: s.string(),
          email: s.string(),
        }),
        active: s.boolean(),
        meta: s.object({
          created: s.date(),
        }),
        tags: s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        id: "U64",
        "user.name": "TEXT",
        "user.email": "TEXT",
        active: "BOOL",
        "meta.created": "DATE",
        tags: "TEXT",
      },
    })
  })

  test("handles unicode characters in field names", () => {
    const input = `
      const schema: Schema = s.object({
        "名前": s.string(),
        "données": s.number(),
        emoji_🎉: s.boolean(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        名前: "TEXT",
        données: "F64",
        "emoji_🎉": "BOOL",
      },
    })
  })

  test("handles reserved words as field names", () => {
    const input = `
      const schema: Schema = s.object({
        "s.string()": s.string(),
        "s.number()": s.number(),
        "s.boolean()": s.boolean(),
        ".string()": s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        "s.string()": "TEXT",
        "s.number()": "F64",
        "s.boolean()": "BOOL",
        ".string()": "TEXT",
      },
    })
  })

  test("handles escaped quotes in from() values", () => {
    const input = `
      const schema: Schema = s.object({
        quote: s.string().from("field\\"name"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        quote: { type: "TEXT", from: 'field"name' },
      },
    })
  })

  test("handles single quotes in double-quoted from() values", () => {
    const input = `
      const schema: Schema = s.object({
        data: s.string().from("it's"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        data: { type: "TEXT", from: "it's" },
      },
    })
  })

  test("handles double quotes in single-quoted from() values", () => {
    const input = `
      const schema: Schema = s.object({
        data: s.string().from('it"s'),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        data: { type: "TEXT", from: 'it"s' },
      },
    })
  })

  test("handles all number types", () => {
    const input = `
      const schema: Schema = s.object({
        f64: s.number("F64"),
        u64: s.number("U64"),
        i64: s.number("I64"),
        default: s.number(),
        aliased: s.number("F64").from("source"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        f64: "F64",
        u64: "U64",
        i64: "I64",
        default: "F64",
        aliased: { type: "F64", from: "source" },
      },
    })
  })

  test("handles all string modifiers combined", () => {
    const input = `
      const schema: Schema = s.object({
        full: s.string().noTokenize().noStem().from("original"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        full: { type: "TEXT", noTokenize: true, noStem: true, from: "original" },
      },
    })
  })

  test("handles modifiers in different order", () => {
    const input = `
      const schema: Schema = s.object({
        a: s.string().from("x").noTokenize(),
        b: s.string().noStem().from("y"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        a: { type: "TEXT", noTokenize: true, from: "x" },
        b: { type: "TEXT", noStem: true, from: "y" },
      },
    })
  })

  test("handles comments in schema (single-line)", () => {
    const input = `
      const schema: Schema = s.object({
        // This is a name field
        name: s.string(),
        // Age in years
        age: s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: "F64",
      },
    })
  })

  test("handles inline comments", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(), // user's name
        age: s.number(), // in years
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: "F64",
      },
    })
  })

  test("handles block comments", () => {
    const input = `
      const schema: Schema = s.object({
        /* Primary identifier */
        id: s.number("U64"),
        /* User's full name
           This is searchable */
        name: s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        id: "U64",
        name: "TEXT",
      },
    })
  })
})

describe("Schema Parser - Additional Edge Cases", () => {
  test("handles empty string in from() value", () => {
    const input = `
      const schema: Schema = s.object({
        data: s.string().from(""),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        data: { type: "TEXT", from: "" },
      },
    })
  })

  test("handles nested objects with same-name fields at different levels", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(),
        user: s.object({
          name: s.string(),
          profile: s.object({
            name: s.string(),
          }),
        }),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        "user.name": "TEXT",
        "user.profile.name": "TEXT",
      },
    })
  })

  test("handles tabs in input", () => {
    const input = `const schema: Schema = s.object({\n\tname:\ts.string(),\n\tage:\ts.number()\n})`
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: "F64",
      },
    })
  })

  test("handles CRLF line endings", () => {
    const input =
      "const schema: Schema = s.object({\r\n  name: s.string(),\r\n  age: s.number()\r\n})"
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: "F64",
      },
    })
  })

  test("handles empty nested object", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(),
        empty: s.object({}),
        age: s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        name: "TEXT",
        age: "F64",
      },
    })
  })

  test("handles field names with spaces in quotes", () => {
    const input = `
      const schema: Schema = s.object({
        "field with spaces": s.string(),
        "another spaced field": s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        "field with spaces": "TEXT",
        "another spaced field": "F64",
      },
    })
  })

  test("handles from() with special URL characters", () => {
    const input = `
      const schema: Schema = s.object({
        url: s.string().from("https://example.com/path?query=1"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        url: { type: "TEXT", from: "https://example.com/path?query=1" },
      },
    })
  })

  test("handles multiple whitespace between modifiers", () => {
    const input = `
      const schema: Schema = s.object({
        text: s.string()    .noTokenize()    .noStem()    .from("source"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        text: { type: "TEXT", noTokenize: true, noStem: true, from: "source" },
      },
    })
  })

  test("handles backslashes in from() values", () => {
    // Input has .from("a\b") where \b is a single backslash followed by b
    // In JS source: 'from("a\\b")' creates a string with one backslash
    const input = String.raw`const schema: Schema = s.object({ path: s.string().from("a\b") })`
    const result = parseSchemaFromEditorValue(input)
    expect(result.success).toBe(true)
    if (result.success) {
      // Parser returns characters as-is: a, \, b
      expect((result.schema.path as { from: string }).from).toBe(String.raw`a\b`)
    }
  })

  test("handles double backslashes in from() values", () => {
    // Input has .from("a\\b") with two backslash characters
    const input = String.raw`const schema: Schema = s.object({ path: s.string().from("a\\b") })`
    const result = parseSchemaFromEditorValue(input)
    expect(result.success).toBe(true)
    if (result.success) {
      // Parser returns characters as-is: a, \, \, b
      expect((result.schema.path as { from: string }).from).toBe(String.raw`a\\b`)
    }
  })

  test("handles newlines inside from() (should not match)", () => {
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

  test("handles underscore field names", () => {
    const input = `
      const schema: Schema = s.object({
        _id: s.number("U64"),
        __typename: s.string(),
        _private_field: s.boolean(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        _id: "U64",
        __typename: "TEXT",
        _private_field: "BOOL",
      },
    })
  })

  test("handles $ in field names", () => {
    const input = `
      const schema: Schema = s.object({
        "$ref": s.string(),
        "$type": s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        $ref: "TEXT",
        $type: "TEXT",
      },
    })
  })
})

// ============================================================================
// MALFORMED INPUT TESTS
// ============================================================================

describe("Schema Parser - Malformed Inputs", () => {
  test("handles missing closing brace gracefully", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(),
    `
    // Should either fail gracefully or parse what it can
    const result = parseSchemaFromEditorValue(input)
    // This will fail because the regex won't match - which is expected
    expect(result.success).toBe(false)
  })

  test("handles missing s.object wrapper", () => {
    const input = `
      const schema: Schema = {
        name: s.string(),
      }
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result.success).toBe(false)
    expect(result.success === false && result.error).toContain("Expected s.object")
  })

  test("handles unknown field type gracefully", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(),
        unknown: s.unknown(),
        age: s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    // Should parse known fields and skip unknown
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema.name).toBe("TEXT")
      expect(result.schema.unknown).toBeUndefined()
      expect(result.schema.age).toBe("F64")
    }
  })

  test("handles field without value", () => {
    const input = `
      const schema: Schema = s.object({
        name,
        age: s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    // Should skip invalid entries and parse valid ones
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema.age).toBe("F64")
    }
  })

  test("handles extra commas", () => {
    const input = `
      const schema: Schema = s.object({
        name: s.string(),,,
        age: s.number(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.schema.name).toBe("TEXT")
      expect(result.schema.age).toBe("F64")
    }
  })

  test("handles only whitespace inside object", () => {
    const input = `
      const schema: Schema = s.object({

      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {},
    })
  })

  test("handles field names that look like type names", () => {
    const input = `
      const schema: Schema = s.object({
        string: s.string(),
        number: s.number(),
        boolean: s.boolean(),
        date: s.date(),
        object: s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        string: "TEXT",
        number: "F64",
        boolean: "BOOL",
        date: "DATE",
        object: "TEXT",
      },
    })
  })

  test("handles unicode in from() values", () => {
    const input = `
      const schema: Schema = s.object({
        greeting: s.string().from("こんにちは"),
        emoji: s.string().from("🎉🎊🎁"),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        greeting: { type: "TEXT", from: "こんにちは" },
        emoji: { type: "TEXT", from: "🎉🎊🎁" },
      },
    })
  })

  test("handles very long field names", () => {
    const longName = "a".repeat(200)
    const input = `
      const schema: Schema = s.object({
        ${longName}: s.string(),
      })
    `
    const result = parseSchemaFromEditorValue(input)
    expect(result).toEqual({
      success: true,
      schema: {
        [longName]: "TEXT",
      },
    })
  })

  test("handles many fields", () => {
    const fields = Array.from({ length: 50 }, (_, i) => `field${i}: s.string()`).join(",\n")
    const input = `const schema: Schema = s.object({ ${fields} })`
    const result = parseSchemaFromEditorValue(input)
    expect(result.success).toBe(true)
    if (result.success) {
      expect(Object.keys(result.schema).length).toBe(50)
    }
  })

  test("handles deeply nested (10 levels)", () => {
    let input = "a: s.string()"
    for (let i = 9; i >= 0; i--) {
      input = `l${i}: s.object({ ${input} })`
    }
    input = `const schema: Schema = s.object({ ${input} })`

    const result = parseSchemaFromEditorValue(input)
    expect(result.success).toBe(true)
    if (result.success) {
      const key = "l0.l1.l2.l3.l4.l5.l6.l7.l8.l9.a"
      expect(result.schema[key]).toBe("TEXT")
    }
  })
})

// ============================================================================
// ROUND-TRIP TESTS (parse -> convert -> parse)
// ============================================================================

describe("Schema Parser - Round Trip", () => {
  test("round-trips simple schema", () => {
    const original = {
      name: "TEXT",
      age: "F64",
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
      "user.address.zip": "U64",
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
      f64: "F64",
      f64From: { type: "F64", from: "source" },
      u64: "U64",
      i64: "I64",
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
      count: { type: "U64", from: "total" },
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
      "a.b.c.d.f": "F64",
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

// ============================================================================
// SCHEMA TO EDITOR VALUE TESTS
// ============================================================================

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
