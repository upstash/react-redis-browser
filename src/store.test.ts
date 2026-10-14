import { describe, expect, test } from "bun:test"

import { tagStoredQueries } from "./store"

describe("tagStoredQueries (queries stored before their editor was recorded)", () => {
  const queries = { a: `{ name: "a" }`, b: `{ name: "b" }` }

  test("the current index in builder mode was written by the builder", () => {
    const tagged = tagStoredQueries({ index: "a", queries, queryBuilderMode: "ui" })
    expect(tagged.queryWrittenBy).toEqual({ a: "ui", b: "code" })
  })

  test("everything is code when the tab is in the code editor", () => {
    const tagged = tagStoredQueries({ index: "a", queries, queryBuilderMode: "code" })
    expect(tagged.queryWrittenBy).toEqual({ a: "code", b: "code" })
  })

  test("existing tags are kept", () => {
    const tagged = tagStoredQueries({
      index: "a",
      queries,
      queryBuilderMode: "code",
      queryWrittenBy: { b: "ui" },
    })
    expect(tagged.queryWrittenBy).toEqual({ a: "code", b: "ui" })
  })
})
