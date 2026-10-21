import { describe, expect, test } from "bun:test"

import { INVALID_QUERY_MESSAGE, parseJSObjectLiteral } from "@/lib/utils"

import { getQueryBuilderError, resolveBuilderQuery } from "./builder-query"
import { stringifyQueryState } from "./query-stringify"
import type { QueryNode, QueryState } from "./types"

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
    // Spelled differently from what the builder writes, but the server runs the same search
    `{ $and: { a: "x", b: "x" } }`,
    `{ $must: { name: "a", age: 1 } }`,
    `{ $and: [{ name: "a" }, { age: 1 }] }`,
    `{ $mustNot: { $and: { f1: 1 } } }`,
    `{ $or: { a: 1 }, $boost: 2 }`,
    // A $mustNot object excludes each of its keys, which the builder reads as separate negations
    `{ $and: { f3: 1 }, $mustNot: { f1: 1, f2: 1 } }`,
    // Next to only a $mustNot, an $or still has to match
    `{ $or: { a: 1 }, $mustNot: { b: 1 } }`,
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
    // The builder keeps one operator per field
    `{ f1: { $eq: 0, $smart: 1 } }`,
    // A lone $boost is not match-all
    `{ $boost: 1 }`,
    `{ $and: { $boost: 1 } }`,
    // How a value is matched depends on the field type, so these are not assumed equal
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

  // The builder writes these, and they read back as a different spelling of the same search
  for (const query of [`{ $and: [{ $or: { f1: 1 } }] }`, `{ $and: { f1: 1 }, $boost: 2 }`]) {
    test(`opens ${query} whichever editor wrote it`, () => {
      expect(getQueryBuilderError(query)).toBeUndefined()
      expect(resolveBuilderQuery(query, "ui").success).toBe(true)
      const fromCode = resolveBuilderQuery(query, "code")
      expect(fromCode.success && fromCode.rewrite).toBeFalsy()
    })
  }

  test("an empty query is not rewritten", () => {
    const result = resolveBuilderQuery("", "ui")
    expect(result.success && result.rewrite).toBeUndefined()
  })
})

describe("reloading what the builder wrote", () => {
  // Deterministic random builder trees
  let seed = 1
  const rnd = () => {
    seed = (seed * 1_103_515_245 + 12_345) & 0x7F_FF_FF_FF
    return seed / 0x7F_FF_FF_FF
  }
  const pick = <T>(items: T[]): T => items[Math.floor(rnd() * items.length)]
  let nextId = 0
  const condition = (): QueryNode => {
    const value = pick<string | number>([1, 2, "x", "y"])
    return {
      id: `n${nextId++}`,
      type: "condition",
      condition: {
        field: pick(["a", "b", "c"]),
        operator: typeof value === "number" ? pick(["eq", "gt"]) : pick(["smart", "eq"]),
        value,
      },
      boost: rnd() < 0.2 ? pick([-1, 0.5, 2]) : undefined,
      not: rnd() < 0.2 || undefined,
    }
  }
  const group = (depth: number, isRoot = false): QueryNode => ({
    id: `n${nextId++}`,
    type: "group",
    groupOperator: pick(["and", "or"]),
    children: Array.from({ length: Math.floor(rnd() * 4) }, () =>
      depth > 0 && rnd() < 0.4 ? group(depth - 1) : condition()
    ),
    boost: rnd() < 0.2 ? pick([-1, 0.5, 2]) : undefined,
    not: (!isRoot && rnd() < 0.2) || undefined,
  })

  test("settles after one load", () => {
    const unstable: string[] = []
    for (let i = 0; i < 6000; i++) {
      const root = group(3, true)
      const written = stringifyQueryState({ root } as QueryState)
      const first = resolveBuilderQuery(written, "ui")
      if (!first.success) throw new Error(first.error)
      const second = resolveBuilderQuery(first.rewrite ?? written, "ui")
      if (!second.success || second.rewrite !== undefined) unstable.push(written)
    }
    expect(unstable).toEqual([])
  })

  test("the guard accepts everything the builder writes", () => {
    const refused: string[] = []
    for (let i = 0; i < 6000; i++) {
      const written = stringifyQueryState({ root: group(3, true) } as QueryState)
      if (getQueryBuilderError(written)) refused.push(written)
    }
    expect(refused).toEqual([])
  })

  test("keeps a root $boost next to a field's own $boost", () => {
    const query = `{ t1: { $smart: "apple", $boost: -1 }, $boost: 0.5 }`
    const result = resolveBuilderQuery(query, "ui")
    if (!result.success) throw new Error(result.error)
    expect(shape(result.state.root)).toEqual({
      not: undefined,
      boost: 0.5,
      op: "and",
      children: [{ not: undefined, boost: -1, field: "t1", operator: "smart", value: "apple" }],
    })
    expect(parseJSObjectLiteral(result.rewrite ?? query)).toEqual(parseJSObjectLiteral(query))
  })

  test("keeps both boosts of a group body and its wrapper", () => {
    const query = `{ $and: { a: 1, b: 2, $boost: 3 }, $boost: 2 }`
    const result = resolveBuilderQuery(query, "ui")
    if (!result.success) throw new Error(result.error)
    const root = result.state.root as QueryNode & { type: "group" }
    expect(root.boost).toBe(2)
    expect(root.children[0].boost).toBe(3)
  })

  test("settles { $and: { n3: { $gte: 3 }, $boost: 0.5 } } in one load", () => {
    const first = resolveBuilderQuery(`{ $and: { n3: { $gte: 3 }, $boost: 0.5 } }`, "ui")
    if (!first.success || first.rewrite === undefined) throw new Error("expected a rewrite")
    const second = resolveBuilderQuery(first.rewrite, "ui")
    expect(second.success && second.rewrite).toBeUndefined()
  })
})

describe("resolveBuilderQuery for typed queries", () => {
  test("an empty query in any spelling opens as an empty tree", () => {
    for (const query of ["", "  ", "{}", "{ }", "{\n}", "{ /* nothing */ }", "{};"]) {
      const result = resolveBuilderQuery(query, "code")
      expect(result.success).toBe(true)
      if (result.success) expect(result.state.root).toMatchObject({ type: "group", children: [] })
    }
  })

  test("a trailing semicolon opens like the query without it", () => {
    const result = resolveBuilderQuery(`{ name: "x" };`, "code")
    expect(result.success).toBe(true)
    if (result.success) {
      expect(result.state.root).toMatchObject({ type: "group", children: [{ type: "condition" }] })
    }
  })

  test("queries the builder can't show are refused", () => {
    for (const query of [
      `{ name: "x"`,
      `{ name: "x" }; {}`,
      `[1]`,
      `{ $boost: 2 }`,
      `{ $must: { a: 1 }, $should: { b: 2 } }`,
    ]) {
      expect(resolveBuilderQuery(query, "code").success).toBe(false)
    }
  })
})
