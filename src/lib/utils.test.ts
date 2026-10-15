import { describe, expect, test } from "bun:test"

import { fromKeySearchPattern, toKeySearchPattern } from "./utils"

describe("toKeySearchPattern", () => {
  test("matches plain text literally as a prefix", () => {
    expect(toKeySearchPattern("user")).toBe("user*")
    expect(toKeySearchPattern("cache[v2]")).toBe(String.raw`cache\[v2\]*`)
    expect(toKeySearchPattern(String.raw`a?b\c`)).toBe(String.raw`a\?b\\c*`)
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
    for (const text of ["user", "cache[v2]", String.raw`a?b\c`, "x\\", "user:*:name", ""]) {
      expect(fromKeySearchPattern(toKeySearchPattern(text))).toBe(text)
    }
  })

  test("returns user globs that plain text can't produce unchanged", () => {
    for (const pattern of ["cache[v2]*", "a?b*", "a*b*", String.raw`x\*`]) {
      expect(fromKeySearchPattern(pattern)).toBe(pattern)
      expect(toKeySearchPattern(fromKeySearchPattern(pattern))).toBe(pattern)
    }
    expect(toKeySearchPattern(fromKeySearchPattern("user:*"))).toBe("user:*")
    expect(fromKeySearchPattern(" *")).toBe(" *")
  })
})
