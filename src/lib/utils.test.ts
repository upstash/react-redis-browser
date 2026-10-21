import { describe, expect, test } from "bun:test"

import { fromKeySearchPattern, toKeySearchPattern } from "./utils"

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
