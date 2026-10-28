import { describe, expect, test } from "bun:test"

import {
  fromKeySearchPattern,
  matchesGlob,
  parseJSObjectLiteral,
  parseSearchQuery,
  toKeySearchPattern,
} from "./utils"

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
    // A raw tab is valid in a JS string but not in JSON
    expect(parseJSObjectLiteral<unknown>(`{ a: "x\ty", b: 'x\u0001y' }`)).toEqual({
      a: "x\ty",
      b: "x\u0001y",
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

  test("supports semicolons ending the statement", () => {
    expect(parseJSObjectLiteral<unknown>(`{ name: "foo" };`)).toEqual({ name: "foo" })
    expect(parseJSObjectLiteral<unknown>(`{ name: "foo" } ;\n\n`)).toEqual({ name: "foo" })
    expect(parseJSObjectLiteral<unknown>(`{ name: "foo" }; // done`)).toEqual({ name: "foo" })
    expect(parseJSObjectLiteral<unknown>(`{ a: ";" };;`)).toEqual({ a: ";" })
    expect(parseJSObjectLiteral<unknown>(`{};`)).toEqual({})
    expect(parseJSObjectLiteral<unknown>(`;`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: 1 }; { b: 2 }`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: 1; }`)).toBeUndefined()
  })

  test("returns undefined for invalid input", () => {
    expect(parseJSObjectLiteral<unknown>(`{ title: "unterminated }`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: undefined }`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{,}`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: [,] }`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: "x\ny" }`)).toBeUndefined()
    // Unclosed block comments
    expect(parseJSObjectLiteral<unknown>(`{ a: 1 } /* x`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: 1 }; /* x`)).toBeUndefined()
    expect(parseJSObjectLiteral<unknown>(`{ a: 1 /* x`)).toBeUndefined()
  })
})

describe("parseSearchQuery", () => {
  test("empty query matches everything, invalid query is undefined", () => {
    expect(parseSearchQuery("  ")).toEqual({})
    expect(parseSearchQuery(`{ title: "x"`)).toBeUndefined()
    expect(parseSearchQuery(`[1]`)).toBeUndefined()
  })
})

describe("toKeySearchPattern", () => {
  test("matches plain text literally as a prefix", () => {
    expect(toKeySearchPattern("user")).toBe("user*")
    expect(toKeySearchPattern("cache[v2]")).toBe(String.raw`cache\[v2\]*`)
    expect(toKeySearchPattern(String.raw`a?b\c`)).toBe(String.raw`a\?b[\\]c*`)
  })

  // The server quotes literal text as \Q...\E, so a backslash is never escaped as \\
  test("writes a literal backslash as a class in every position", () => {
    expect(toKeySearchPattern(String.raw`logs\Error`)).toBe(String.raw`logs[\\]Error*`)
    expect(toKeySearchPattern(String.raw`\E`)).toBe(String.raw`[\\]E*`)
    expect(toKeySearchPattern(String.raw`a\\E`)).toBe(String.raw`a[\\][\\]E*`)
    expect(toKeySearchPattern(String.raw`a\Qb`)).toBe(String.raw`a[\\]Qb*`)
    expect(toKeySearchPattern("x\\")).toBe(String.raw`x[\\]*`)
    expect(toKeySearchPattern(String.raw`\[`)).toBe(String.raw`[\\]\[*`)
  })

  test("keeps text with * as a glob", () => {
    expect(toKeySearchPattern("user:*:name")).toBe("user:*:name")
    expect(toKeySearchPattern("cache[v2]*")).toBe("cache[v2]*")
  })

  test("leaves empty text alone", () => {
    expect(toKeySearchPattern("")).toBe("")
    expect(toKeySearchPattern("  ")).toBe("  ")
  })
})

describe("fromKeySearchPattern", () => {
  test("round-trips text through the pattern", () => {
    for (const text of [
      "user",
      "cache[v2]",
      String.raw`a?b\c`,
      "x\\",
      String.raw`logs\Error`,
      String.raw`a\\E`,
      String.raw`\Q`,
      String.raw`[\]`,
      "user:*:name",
      "",
    ]) {
      expect(fromKeySearchPattern(toKeySearchPattern(text))).toBe(text)
    }
  })

  test("returns user globs that plain text can't produce unchanged", () => {
    for (const pattern of [
      "cache[v2]*",
      "a?b*",
      "a*b*",
      String.raw`x\*`,
      String.raw`a\\b*`,
      String.raw`a[\\]b[c]*`,
    ]) {
      expect(fromKeySearchPattern(pattern)).toBe(pattern)
      expect(toKeySearchPattern(fromKeySearchPattern(pattern))).toBe(pattern)
    }
    expect(toKeySearchPattern(fromKeySearchPattern("user:*"))).toBe("user:*")
    expect(fromKeySearchPattern(" *")).toBe(" *")
  })
})

describe("matchesGlob", () => {
  test.each([
    ["user*", "user:1", true],
    ["user*", "order:1", false],
    ["*", "", true],
    ["h?llo", "hello", true],
    ["h?llo", "hllo", false],
    ["h[ae]llo", "hallo", true],
    ["h[ae]llo", "hillo", false],
    ["h[^e]llo", "hallo", true],
    ["h[^e]llo", "hello", false],
    ["h[a-c]llo", "hbllo", true],
    ["h[c-a]llo", "hbllo", false],
    ["a[x-]b", "a-b", true],
    ["h[a-c]llo", "hdllo", false],
    [String.raw`h\*llo`, "h*llo", true],
    [String.raw`h\*llo`, "hello", false],
    ["a.b", "axb", false],
    ["a[]b", "axb", false],
    ["a[^]b", "axb", false],
    [String.raw`a[\]]b`, "a]b", true],
    ["a(b)|c", "a(b)|c", true],
    ["a\\", "a\\", true],
    ["a[bc", "ab", true],
    ["?", "😀", true],
    ["a?b", "a😀b", true],
    ["a??b", "a😀b", false],
    ["a[😀]b", "a😀b", true],
    ["[", "[", true],
    ["a[", "a[", true],
    ["a[^", "a[^", false],
    ["a[\\", "a\\", false],
    ["a[\\", "a[\\", true],
    ["a[b\\", "ab", false],
    // Upstash runs the class as a Go regex, where `\d`, `\w` and `\t` are escapes
    [String.raw`user:[\d]*`, "user:1", true],
    [String.raw`user:[\d]*`, "user:d", false],
    [String.raw`[\w-]`, "_", true],
    [String.raw`[^\s]`, "x", true],
    [String.raw`a[\t]b`, "a\tb", true],
    [String.raw`a[\q]b`, "aqb", false],
    // Patterns Upstash can't turn into a regexp only match themselves
    ["a[]b", "a[]b", true],
    ["*[]", "x[]", false],
    ["*\\", "a\\", false],
    ["*\\", "*\\", true],
    ["*[", "x[", false],
    ["*[", "*[", true],
    ["*[b\\", "*[b\\", true],
  ])("%p matches %p: %p", (pattern, value, expected) => {
    expect(matchesGlob(pattern, value)).toBe(expected)
  })

  test("matches keys starting with the text the search box escaped", () => {
    for (const text of ["cache[v2]", String.raw`a?b\c`, "x\\", String.raw`a\\E`, String.raw`[\]`]) {
      const pattern = toKeySearchPattern(text)
      expect(matchesGlob(pattern, `${text}:1`)).toBe(true)
      expect(matchesGlob(pattern, `z${text}`)).toBe(false)
    }
  })
})
