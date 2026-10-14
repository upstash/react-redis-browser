import { describe, expect, test } from "bun:test"

import { INVALID_QUERY_MESSAGE } from "@/lib/utils"

import { getQueryBuilderError, resolveBuilderQuery } from "./builder-query"
import { stringifyQueryState } from "./query-stringify"
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

const x = (field: string, extra = {}) => ({ field, operator: "smart", value: "x", ...extra })

describe("getQueryBuilderError (code editor → builder)", () => {
  const accepted = [
    ``,
    `{}`,
    `{ name: "a" }`,
    `{ name: { $smart: "a" } }`,
    `{ age: 25 }`,
    `{ age: { $eq: 25 } }`,
    `{ title: "Error, code: 42" }`,
    `{ $and: { inStock: true }, $mustNot: { category: "electronics" } }`,
    `{ $or: { name: "a", age: 1 } }`,
  ]
  for (const query of accepted) {
    test(`accepts ${query}`, () => {
      expect(getQueryBuilderError(query)).toBeUndefined()
    })
  }

  const refused = [
    // Range operators on one field: the builder keeps one condition per field object
    `{ price: { $gte: 10, $lte: 100 } }`,
    // The server excludes each key of a $mustNot object, the builder would negate the group
    `{ f4: "x", $mustNot: { $and: { f1: "x" }, $mustNot: { f2: "x" } } }`,
    // [{}] matches everything, the builder would drop the empty group
    `{ $or: [{ f3: "x" }, { $and: [{}] }] }`,
    `{ $must: { name: "a" }, $should: { title: "b" } }`,
    `{ name: { $fuzzy: { value: "a", prefix: true } } }`,
    // A $mustNot object excludes each key, an $and body inside it is not a query node
    `{ $and: { f3: 1 }, $mustNot: { f1: 1, f2: 1 } }`,
    `{ $mustNot: { $and: { f1: 1 } } }`,
    // The builder keeps one operator per field
    `{ f1: { $eq: 0, $smart: 1 } }`,
    // A lone $boost is not match-all
    `{ $boost: 1 }`,
    `{ $and: { $boost: 1 } }`,
    // Only the builder's own output shapes are accepted, not equivalent spellings
    `{ $must: { name: "a", age: 1 } }`,
    `{ age: { $smart: 25 } }`,
    `{ age: { $eq: 25, $boost: 1 } }`,
  ]
  for (const query of refused) {
    test(`refuses ${query}`, () => {
      expect(getQueryBuilderError(query)).toContain("Code Editor")
    })
  }

  test("refuses invalid syntax", () => {
    expect(getQueryBuilderError(`{ name: "a"`)).toBe(INVALID_QUERY_MESSAGE)
  })
})

describe("resolveBuilderQuery (stored query → builder)", () => {
  test("a query typed in the code editor is never rewritten", () => {
    const query = `{ f4: "x", $mustNot: { $and: { f1: "x" }, $mustNot: { f2: "x" } } }`
    expect(resolveBuilderQuery(query, "code")).toEqual({
      success: false,
      error: getQueryBuilderError(query)!,
    })
  })

  test("a query typed in the code editor that the builder keeps is opened as is", () => {
    const result = resolveBuilderQuery(`{ name: "a" }`, "code")
    expect(result.success && result.rewrite).toBeFalsy()
  })

  test("invalid syntax is never loaded, even if the builder wrote it", () => {
    expect(resolveBuilderQuery(`{ name: "a"`, "ui")).toEqual({
      success: false,
      error: INVALID_QUERY_MESSAGE,
    })
  })

  // What older builder versions wrote, and the builder tree they were written from
  const legacy: [string, unknown][] = [
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
    [
      `{ a: "x", $and: { b: "x" }, $mustNot: { c: "x" } }`,
      { op: "and", children: [x("a"), { op: "and", children: [x("b")] }, x("c", { not: true })] },
    ],
    [`{ $or: [{ a: "x" }, {}] }`, { op: "or", children: [x("a")] }],
    [`{ $or: [{ a: "x" }, { $boost: 2 }] }`, { op: "or", children: [x("a")] }],
    [`{ $boost: 2 }`, { op: "and", children: [] }],
  ]
  for (const [query, expected] of legacy) {
    test(`loads ${query} written by the builder`, () => {
      const result = resolveBuilderQuery(query, "ui")
      if (!result.success) throw new Error(result.error)
      expect(shape(result.state.root)).toEqual(expected)
      // What is stored afterwards is exactly what the builder shows
      expect(result.rewrite ?? query).toBe(stringifyQueryState(result.state))
    })
  }

  // The builder writes these, the guard alone would refuse them
  for (const query of [`{ f1: 1, $boost: 2 }`, `{ $and: [{ $or: { f1: 1 } }] }`]) {
    test(`opens ${query} without the guard when the builder wrote it`, () => {
      expect(getQueryBuilderError(query)).toBeDefined()
      expect(resolveBuilderQuery(query, "ui").success).toBe(true)
      expect(resolveBuilderQuery(query, "code").success).toBe(false)
    })
  }

  test("an empty query is not rewritten", () => {
    const result = resolveBuilderQuery("", "ui")
    expect(result.success && result.rewrite).toBeUndefined()
  })
})
