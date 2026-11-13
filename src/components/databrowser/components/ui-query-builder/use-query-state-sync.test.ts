import { describe, expect, test } from "bun:test"

import { parseBuilderQuery } from "./query-parser"
import { loadBuilderQuery } from "./use-query-state-sync"

describe("loadBuilderQuery", () => {
  test("loads a parseable query as its tree", () => {
    const loaded = loadBuilderQuery(`{ name: "x" }`)
    expect(loaded.error).toBeUndefined()
    expect(loaded.state.root).toMatchObject({ type: "group", children: [{ type: "condition" }] })
  })

  test("an empty query in any spelling loads as an empty tree", () => {
    for (const query of ["", "  ", "{}", "{ }", "{\n}"]) {
      const loaded = loadBuilderQuery(query)
      expect(loaded.error).toBeUndefined()
      expect(loaded.state.root).toMatchObject({ type: "group", children: [] })
    }
  })

  test("an unparseable query gives an error and an empty tree, never a previous one", () => {
    for (const query of [
      `{ name: "x"`,
      `[1]`,
      `{ $boost: 2 }`,
      `{ $must: { a: 1 }, $should: { b: 2 } }`,
    ]) {
      const loaded = loadBuilderQuery(query)
      expect(loaded.error).toBeString()
      expect(loaded.state.root).toMatchObject({ type: "group", children: [] })
      expect(parseBuilderQuery(query).success).toBe(false)
    }
  })
})
