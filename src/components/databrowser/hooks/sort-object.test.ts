import { describe, expect, test } from "bun:test"

import { sortObject } from "./use-fetch-simple-key"

describe("sortObject", () => {
  test("keeps arrays as arrays", () => {
    expect(sortObject([0, "a", null])).toEqual([0, "a", null])
  })

  test("sorts object keys recursively, including objects inside arrays", () => {
    const sorted = sortObject({ b: [{ d: 1, c: [{ f: 2, e: 3 }] }], a: { z: 1, y: 2 } })
    expect(JSON.stringify(sorted)).toBe('{"a":{"y":2,"z":1},"b":[{"c":[{"e":3,"f":2}],"d":1}]}')
  })
})
