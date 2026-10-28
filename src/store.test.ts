import { describe, expect, test } from "bun:test"
import { create } from "zustand"

import { storeCreator, type TabId } from "./store"

const setup = () => {
  const store = create(storeCreator)
  const ids = [store.getState().addTab(), store.getState().addTab(), store.getState().addTab()]
  return { store, ids }
}

describe("deselectKeys", () => {
  test("removes keys from open and closed tab selections", () => {
    const { store, ids } = setup()
    const [a, b, c] = ids
    store.getState().setSelectedKeys(a, ["k1", "k2", "k3"])
    store.getState().setSelectedKeys(b, ["k1"])
    store.getState().setSelectedKeys(c, ["k2"])
    store.getState().removeTab(c)

    store.getState().deselectKeys(["k1", "k2"])

    const selected = (id: TabId) => store.getState().getSelectedKeys(id)
    expect(selected(a)).toEqual(["k3"])
    expect(selected(b)).toEqual([])
    expect(store.getState().closedTabs.at(-1)?.[0].selectedKeys).toEqual([])
  })
})
