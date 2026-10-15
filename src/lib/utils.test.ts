import { describe, expect, test } from "bun:test"

import { parseJSObjectLiteral } from "./utils"

describe("parseJSObjectLiteral", () => {
  test("never rewrites string contents", () => {
    expect(parseJSObjectLiteral<unknown>(`{ title: "Error, code: 42" }`)).toEqual({
      title: "Error, code: 42",
    })
    expect(parseJSObjectLiteral<unknown>(`{ title: "a,}", }`)).toEqual({ title: "a,}" })
    expect(parseJSObjectLiteral<unknown>(`{ a: "x\\'y" }`)).toEqual({ a: "x'y" })
    expect(parseJSObjectLiteral<unknown>(`{ a: "// not a comment" }`)).toEqual({
      a: "// not a comment",
    })
  })

  test("supports single quotes, comments and trailing commas", () => {
    expect(
      parseJSObjectLiteral<unknown>(`{
        // comment
        'name': 'it\\'s "x"', /* block */
        $and: [1, 2,],
      }`)
    ).toEqual({ name: `it's "x"`, $and: [1, 2] })
  })

  test("returns undefined for invalid input", () => {
    expect(parseJSObjectLiteral<unknown>(`{ title: "unterminated }`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: undefined }`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{,}`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: [,] }`)).toBeUndefined()
  })
})
