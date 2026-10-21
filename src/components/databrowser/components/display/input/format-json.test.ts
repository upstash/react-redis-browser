import { describe, expect, test } from "bun:test"

import {
  formatJSON,
  getJSONSource,
  registerStoredValueMapper,
  toStoredValue,
  toStoredValues,
} from "./format-json"

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

describe("getJSONSource", () => {
  test("formats canonical compact JSON natively", () => {
    expect(getJSONSource('{"a":[1,"x"]}')).toEqual({
      data: '{"a":[1,"x"]}',
      formatted: '{\n  "a": [\n    1,\n    "x"\n  ]\n}',
      isCompact: true,
    })
  })

  test("detects compact JSON that native formatting would change", () => {
    const source = getJSONSource(String.raw`{"a":1.50,"b":"\u00e9"}`)!
    expect(source.isCompact).toBe(true)
    expect(source.formatted).toBe('{\n  "a": 1.50,\n  "b": "\\u00e9"\n}')
    expect(toStoredValue(source.formatted.replace("1.50", "2.50"), source)).toBe(
      String.raw`{"a":2.50,"b":"\u00e9"}`
    )
  })

  test("rejects invalid JSON", () => {
    expect(getJSONSource("{")).toBeUndefined()
  })
})

describe("toStoredValues", () => {
  test("maps registered fields when saving and leaves the rest", () => {
    const form = { control: {} }
    const source = getJSONSource('{"id":1}')!
    const unregister = registerStoredValueMapper(form.control, "value", (value) =>
      toStoredValue(value, source)
    )
    const values = { key: '{\n  "id": 2\n}', value: '{\n  "id": 2\n}' }
    expect(toStoredValues(form, values)).toEqual({ key: values.key, value: '{"id":2}' })

    unregister()
    expect(toStoredValues(form, values)).toEqual(values)
  })

  test("keeps the newer mapper when an older one unregisters", () => {
    const form = { control: {} }
    const unregisterOld = registerStoredValueMapper(form.control, "value", () => "old")
    registerStoredValueMapper(form.control, "value", () => "new")
    unregisterOld()
    expect(toStoredValues(form, { value: "x" })).toEqual({ value: "new" })
  })
})
