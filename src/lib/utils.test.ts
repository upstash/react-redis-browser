import { describe, expect, test } from "bun:test"

import { matchesGlob } from "./utils"

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
  ])("%p matches %p: %p", (pattern, value, expected) => {
    expect(matchesGlob(pattern, value)).toBe(expected)
  })
})
