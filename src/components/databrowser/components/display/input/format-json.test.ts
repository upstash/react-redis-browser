import { describe, expect, test } from "bun:test"

import { formatJSON } from "./format-json"

describe("formatJSON", () => {
  test("matches JSON.stringify indentation", () => {
    const value = String.raw`{"b":[1,{"c":"x, y: [z]"},[]],"a":{},"d":null,"e":"\"q\""}`
    expect(formatJSON(value)).toBe(JSON.stringify(JSON.parse(value), null, 2))
  })

  test("keeps scalars exactly as stored", () => {
    expect(formatJSON("12345678901234567890")).toBe("12345678901234567890")
    expect(formatJSON("10.00")).toBe("10.00")
    expect(formatJSON("1e5")).toBe("1e5")
    expect(formatJSON(String.raw`"caf\u00e9"`)).toBe(String.raw`"caf\u00e9"`)
  })

  test("keeps numbers and key order inside objects", () => {
    expect(formatJSON('{ "z": 12345678901234567890, "a": 1.50 }')).toBe(
      '{\n  "z": 12345678901234567890,\n  "a": 1.50\n}'
    )
  })
})
