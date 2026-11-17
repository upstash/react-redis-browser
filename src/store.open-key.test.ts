import { describe, expect, test } from "bun:test"
import { create } from "zustand"

import { storeCreator, type TabId } from "./store"

const tabData = (store: ReturnType<typeof setup>, id: TabId | undefined) =>
  store.getState().tabs.find(([tabId]) => tabId === id)?.[1]

const setup = () => create(storeCreator)

describe("openKeyInNewTab", () => {
  test("keeps the source tab's values search and selects the key", () => {
    const store = setup()
    const source = store.getState().addTab()
    store.getState().setIsValuesSearchSelected(source, true)
    store.getState().setValuesSearchIndex(source, "users")
    store.getState().setValuesSearchQuery(source, "{ name: 'a' }")
    store.getState().setSearch(source, { key: "user:*", type: "hash" })
    store.getState().setSelectedKey(source, "other")

    const id = store.getState().openKeyInNewTab(source, "user:1", { key: "field" })

    expect(id).not.toBe(source)
    expect(store.getState().selectedTab).toBe(id)
    expect(tabData(store, id)).toEqual({
      id,
      selectedKeys: ["user:1"],
      selectedListItem: { key: "field" },
      search: { key: "user:*", type: "hash" },
      valuesSearch: {
        index: "users",
        queries: { users: "{ name: 'a' }" },
        queryBuilderMode: "ui",
      },
      isValuesSearchSelected: true,
      pinned: false,
    })
  })

  test("keeps the source tab's key search in keys mode", () => {
    const store = setup()
    const source = store.getState().addTab()
    store.getState().setSearch(source, { key: "session:*", type: "string" })

    const id = store.getState().openKeyInNewTab(source, "session:1")

    const data = tabData(store, id)
    expect(data?.isValuesSearchSelected).toBe(false)
    expect(data?.search).toEqual({ key: "session:*", type: "string" })
    expect(data?.selectedKeys).toEqual(["session:1"])
    expect(data?.selectedListItem).toBeUndefined()
  })

  test("does not pin the new tab when the source is pinned", () => {
    const store = setup()
    const source = store.getState().addTab()
    store.getState().togglePinTab(source)

    const id = store.getState().openKeyInNewTab(source, "k")

    expect(tabData(store, id)?.pinned).toBe(false)
    expect(tabData(store, source)?.pinned).toBe(true)
  })

  test("falls back to an empty search when the source tab is gone", () => {
    const store = setup()

    const id = store.getState().openKeyInNewTab("missing" as TabId, "k")

    const data = tabData(store, id)
    expect(data?.search).toEqual({ key: "", type: undefined })
    expect(data?.isValuesSearchSelected).toBe(false)
    expect(data?.selectedKeys).toEqual(["k"])
  })
})
