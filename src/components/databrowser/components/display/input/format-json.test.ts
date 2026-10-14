import { describe, expect, test } from "bun:test"

import { formatJSON, getJSONSource, toStoredValue } from "./format-json"

describe("formatJSON", () => {
  test("matches JSON.stringify indentation", () => {
    const value = String.raw`{ "b":[1,{"c":"x, y: [z]"},[ ]],"a":{},"d":null,"e":"\"q\""}`
    expect(formatJSON(value)).toBe(JSON.stringify(JSON.parse(value), undefined, 2))
    expect(formatJSON(value, 0)).toBe(JSON.stringify(JSON.parse(value)))
  })

  test("keeps scalars exactly as stored", () => {
    expect(formatJSON("12345678901234567890")).toBe("12345678901234567890")
    expect(formatJSON("10.00")).toBe("10.00")
    expect(formatJSON("1e5")).toBe("1e5")
    expect(formatJSON(String.raw`"café"`)).toBe(String.raw`"café"`)
  })

  test("keeps numbers and key order inside objects", () => {
    expect(formatJSON('{ "z": 12345678901234567890, "a": 1.50 }')).toBe(
      '{\n  "z": 12345678901234567890,\n  "a": 1.50\n}'
    )
    expect(formatJSON('{\n  "z": 1.50\n}', 0)).toBe('{"z":1.50}')
  })
})

describe("toStoredValue", () => {
  test("maps the untouched formatted view back to the stored value", () => {
    const source = getJSONSource('{"id":1, "a":2}')!
    expect(toStoredValue(source.formatted, source)).toBe('{"id":1, "a":2}')
  })

  test("compacts edits when the stored value was compact", () => {
    const source = getJSONSource('{"id":1}')!
    expect(toStoredValue('{\n  "id": 2.0\n}', source)).toBe('{"id":2.0}')
    expect(toStoredValue('{\n  "id": ', source)).toBe('{\n  "id": ')
  })

  test("keeps edits as typed when the stored value was not compact", () => {
    const source = getJSONSource('{\n  "id": 1\n}')!
    expect(toStoredValue('{\n  "id": 2\n}', source)).toBe('{\n  "id": 2\n}')

    const scalar = getJSONSource("42\n")!
    expect(scalar.formatted).toBe("42")
    expect(toStoredValue("42\n\n", scalar)).toBe("42\n\n")
  })
})
