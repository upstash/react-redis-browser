import { describe, expect, test } from "bun:test"

import { getQueryBuilderError, parseQueryString } from "./query-parser"
import type { QueryNode } from "./types"

/** Strip generated ids so trees can be compared */
const shape = (node: QueryNode): unknown => {
  if (node.type === "condition") {
    const { field, operator, value } = node.condition
    return { not: node.not, boost: node.boost, field, operator, value }
  }
  return {
    not: node.not,
    boost: node.boost,
    op: node.groupOperator,
    children: node.children.map((child) => shape(child)),
  }
}

const parse = (query: string) => {
  const state = parseQueryString(query)
  if (!state) throw new Error(`Failed to parse ${query}`)
  return shape(state.root)
}

const cond = (field: string, operator: string, value: unknown, extra = {}) => ({
  field,
  operator,
  value,
  ...extra,
})

describe("query parser", () => {
  test("parses every operator of a field", () => {
    expect(parse(`{ price: { $gte: 10, $lte: 100 } }`)).toEqual({
      op: "and",
      children: [cond("price", "gte", 10), cond("price", "lte", 100)],
    })
    expect(parse(`{ $or: { price: { $gte: 10, $lte: 100, $boost: 2 }, name: "a" } }`)).toEqual({
      op: "or",
      children: [
        { op: "and", boost: 2, children: [cond("price", "gte", 10), cond("price", "lte", 100)] },
        cond("name", "smart", "a"),
      ],
    })
  })

  test("splits a $mustNot object into one exclusion per key", () => {
    expect(parse(`{ name: "a", $mustNot: { category: "b", title: "c" } }`)).toEqual({
      op: "and",
      children: [
        cond("name", "smart", "a"),
        cond("category", "smart", "b", { not: true }),
        cond("title", "smart", "c", { not: true }),
      ],
    })
  })

  test("parses $mustNot without positive conditions as everything except", () => {
    expect(parse(`{ $mustNot: [{ category: "b" }, { title: "c" }] }`)).toEqual({
      op: "and",
      children: [
        cond("category", "smart", "b", { not: true }),
        cond("title", "smart", "c", { not: true }),
      ],
    })
    // Inside $or it is one more alternative, not an exclusion of the whole group
    expect(parse(`{ $or: [{ name: "a" }, { $mustNot: { category: "b" } }] }`)).toEqual({
      op: "or",
      children: [
        cond("name", "smart", "a"),
        { op: "and", children: [cond("category", "smart", "b", { not: true })] },
      ],
    })
    // Inside $and the exclusion joins the group
    expect(parse(`{ $and: [{ name: "a" }, { $mustNot: { category: "b" } }] }`)).toEqual({
      op: "and",
      children: [cond("name", "smart", "a"), cond("category", "smart", "b", { not: true })],
    })
  })

  test("keeps $mustNot inside object bodies", () => {
    expect(parse(`{ $and: { name: "a", $mustNot: { category: "b" } } }`)).toEqual({
      op: "and",
      children: [cond("name", "smart", "a"), cond("category", "smart", "b", { not: true })],
    })
  })

  test("parses $mustNot next to $and once", () => {
    expect(parse(`{ name: "a", $and: { title: "c" }, $mustNot: { category: "b" } }`)).toEqual({
      op: "and",
      children: [
        cond("name", "smart", "a"),
        { op: "and", children: [cond("title", "smart", "c")] },
        cond("category", "smart", "b", { not: true }),
      ],
    })
  })

  test("parses strings containing colons and commas", () => {
    expect(parse(`{ title: "Error, code: 42" }`)).toEqual({
      op: "and",
      children: [cond("title", "smart", "Error, code: 42")],
    })
  })
})

describe("getQueryBuilderError", () => {
  const supported = [
    ``,
    `{}`,
    `{ name: "a", price: { $gte: 10, $lte: 100 } }`,
    `{ $or: { name: "a", $and: { price: 1, title: "b" } } }`,
    `{ $and: [{ name: "a" }, { $or: { title: "b", category: "c" } }] }`,
    `{ $must: { name: "a" }, $mustNot: { title: "b" } }`,
    `{ name: { $fuzzy: { value: "a", distance: 2 } } }`,
    `{ name: { $phrase: { value: "a b", slop: 0, prefix: true } } }`,
  ]
  for (const query of supported) {
    test(`supports ${query}`, () => {
      expect(getQueryBuilderError(query)).toBeUndefined()
    })
  }

  const unsupported = [
    `{ name: "a"`,
    `{ name: "a", $or: { title: "b" } }`,
    `{ $and: { name: "a" }, $or: { title: "b" } }`,
    `{ $must: { name: "a" }, $should: { title: "b" } }`,
    `{ $must: { name: "a" }, $and: { title: "b" } }`,
    `{ $or: [{ name: "a" }, {}] }`,
    `{ $boost: { query: { name: "a" }, value: 2 } }`,
    `{ name: { $foo: "a" } }`,
    `{ name: { $fuzzy: { value: "a", prefix: true } } }`,
    `{ $rrf: { retrievers: [] } }`,
    `{ $mustNot: [] }`,
    `{ $and: [] }`,
    `{ price: { $gt: 1, $gte: 2 } }`,
    `{ name: { $phrase: { value: "a b", slop: 2, prefix: true } } }`,
  ]
  for (const query of unsupported) {
    test(`rejects ${query}`, () => {
      expect(getQueryBuilderError(query)).toBeString()
    })
  }
})

const legacy = (query: string) => {
  const state = parseQueryString(query, { allowLegacy: true })
  if (!state) throw new Error(`Failed to parse ${query}`)
  return shape(state.root)
}
const x = (field: string, extra = {}) => cond(field, "smart", "x", extra)

describe("legacy builder output", () => {
  // What older builder versions wrote, and the builder tree they were written from
  const cases: [string, unknown][] = [
    [
      `{ a: "x", $or: { b: "x", c: "x" } }`,
      { op: "and", children: [x("a"), { op: "or", children: [x("b"), x("c")] }] },
    ],
    [
      `{ $and: { a: "x", b: "x" }, $or: { c: "x", d: "x" } }`,
      {
        op: "and",
        children: [
          { op: "and", children: [x("a"), x("b")] },
          { op: "or", children: [x("c"), x("d")] },
        ],
      },
    ],
    [`{ $or: [{ a: "x" }, {}] }`, { op: "or", children: [x("a")] }],
    [`{ $or: [{ a: "x" }, { $boost: 2 }] }`, { op: "or", children: [x("a")] }],
    [
      `{ a: "x", $mustNot: { $and: [{ b: "x" }, { $or: { c: "x", d: "x" } }], $boost: 2 } }`,
      {
        op: "and",
        children: [
          x("a"),
          {
            op: "and",
            not: true,
            boost: 2,
            children: [x("b"), { op: "or", children: [x("c"), x("d")] }],
          },
        ],
      },
    ],
  ]

  for (const [query, expected] of cases) {
    test(`reads ${query} with the builder's intent`, () => {
      expect(getQueryBuilderError(query)).toBeString()
      expect(getQueryBuilderError(query, { allowLegacy: true })).toBeUndefined()
      expect(legacy(query)).toEqual(expected)
    })
  }

  test("never changes a query the strict parser accepts", () => {
    const query = `{ $mustNot: { $and: { b: "x" }, c: "x" } }`
    expect(legacy(query)).toEqual(parse(query))
  })
})

describe("error messages", () => {
  test("say what to change", () => {
    expect(getQueryBuilderError(`{ a: "x", $or: { b: "x" } }`)).toContain("$and: [")
    expect(getQueryBuilderError(`{ $must: { a: "x" }, $and: { b: "x" } }`)).toContain(
      "$must and $and"
    )
    expect(getQueryBuilderError(`{ $and: { a: "x" }, $must: { b: "x" } }`)).toContain(
      "$must and $and"
    )
  })
})
