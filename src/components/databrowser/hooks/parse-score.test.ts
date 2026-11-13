import { describe, expect, test } from "bun:test"

import { parseScore } from "./use-edit-list-item"

describe("parseScore", () => {
  test("parses finite numbers", () => {
    expect(parseScore("1.5")).toBe(1.5)
    expect(parseScore(" -2 ")).toBe(-2)
    expect(parseScore("1e3")).toBe(1000)
    expect(parseScore(".5")).toBe(0.5)
    expect(parseScore("+3.")).toBe(3)
  })

  test("accepts Redis infinite scores", () => {
    expect(parseScore("inf")).toBe("+inf")
    expect(parseScore("+inf")).toBe("+inf")
    expect(parseScore("-inf")).toBe("-inf")
    expect(parseScore("INF")).toBe("+inf")
    expect(parseScore("Infinity")).toBe("+inf")
    expect(parseScore("-infinity")).toBe("-inf")
  })

  test("rejects empty and invalid scores", () => {
    expect(parseScore("")).toBeUndefined()
    expect(parseScore("  ")).toBeUndefined()
    expect(parseScore()).toBeUndefined()
    expect(parseScore("abc")).toBeUndefined()
    expect(parseScore("nan")).toBeUndefined()
    expect(parseScore("0x1A")).toBeUndefined()
    expect(parseScore("1e999")).toBeUndefined()
  })
})
