import { describe, expect, test } from "bun:test"

import { fromKeySearchPattern, matchesGlob, toKeySearchPattern } from "./utils"

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
