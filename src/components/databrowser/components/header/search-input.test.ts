import { describe, expect, test } from "bun:test"

import { isHistoryTab } from "./search-input"

const base = {
  key: "Tab",
  shiftKey: false,
  isHistoryOpen: true,
  focusedIndex: 0,
  historyLength: 3,
  isKeyboardNav: true,
}

describe("isHistoryTab", () => {
  test("steps through the list after entering it with the keyboard", () => {
    expect(isHistoryTab(base)).toBe(true)
    expect(isHistoryTab({ ...base, focusedIndex: 2, shiftKey: true })).toBe(true)
  })

  test("does not capture Tab for a row highlighted by hovering", () => {
    expect(isHistoryTab({ ...base, isKeyboardNav: false })).toBe(false)
    expect(isHistoryTab({ ...base, isKeyboardNav: false, shiftKey: true })).toBe(false)
  })

  test("lets Tab leave the input outside the list and past its ends", () => {
    expect(isHistoryTab({ ...base, focusedIndex: -1 })).toBe(false)
    expect(isHistoryTab({ ...base, focusedIndex: -1, shiftKey: true })).toBe(false)
    expect(isHistoryTab({ ...base, focusedIndex: 2 })).toBe(false)
    expect(isHistoryTab({ ...base, isHistoryOpen: false })).toBe(false)
    expect(isHistoryTab({ ...base, key: "Enter" })).toBe(false)
  })
})
