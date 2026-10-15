import { describe, expect, test } from "bun:test"
import { create } from "zustand"

import { storeCreator } from "./store"

const setup = () => {
  const store = create(storeCreator)
  const ids = [store.getState().addTab(), store.getState().addTab(), store.getState().addTab()]
  return { store, ids }
}

describe("removeTab", () => {
  test("selects the left neighbour, or the right one for the first tab", () => {
    const { store, ids } = setup()
    const [a, b, c] = ids

    store.getState().selectTab(b)
    store.getState().removeTab(b)
    expect(store.getState().selectedTab).toBe(a)

    store.getState().removeTab(a)
    expect(store.getState().selectedTab).toBe(c)
  })

  test("follows the tab bar order, where pinned tabs come first", () => {
    // Stored order a, b, p; shown as p (pinned), a, b
    const { store, ids } = setup()
    const [a, b, p] = ids
    store.getState().togglePinTab(p)

    store.getState().selectTab(a)
    store.getState().removeTab(a)
    expect(store.getState().selectedTab).toBe(p)

    store.getState().selectTab(b)
    store.getState().forceRemoveTab(b)
    expect(store.getState().selectedTab).toBe(p)
  })
})
