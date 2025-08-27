import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import type { StoreApi, UseBoundStore } from "zustand"
import { create, useStore, type StateCreator } from "zustand"
import { persist } from "zustand/middleware"

import type { RedisBrowserStorage } from "./components/databrowser"
import type { DataType } from "./types"

// Re-export for backward compatibility
export type { RedisCredentials } from "./redis-context"

type DatabrowserContextProps = {
  store: DatabrowserStoreObject
  rootRef: React.RefObject<HTMLDivElement>
}

const DatabrowserContext = createContext<DatabrowserContextProps | undefined>(undefined)

export const DatabrowserProvider = ({
  children,
  storage,
  rootRef,
}: PropsWithChildren<{
  storage?: RedisBrowserStorage
  rootRef: React.RefObject<HTMLDivElement>
}>) => {
  const store = useMemo(() => {
    if (!storage) return create<DatabrowserStore>(storeCreator)

    return create<DatabrowserStore>()(
      persist(storeCreator, {
        name: "redis-browser-data",
        storage: {
          getItem: () => {
            const data = storage.get()
            if (!data) return null

            try {
              return JSON.parse(data)
            } catch {
              console.error("Error while parsing stored data.")
              return null
            }
          },
          setItem: (_name, value) => storage.set(JSON.stringify(value)),
          removeItem: () => {},
        },
        version: 1,
        // @ts-expect-error Reset the store for < v1
        migrate: (state, version) => {
          if (version === 0) {
            return
          }

          return state
        },
      })
    )
  }, [])

  return (
    <DatabrowserContext.Provider value={{ store, rootRef }}>{children}</DatabrowserContext.Provider>
  )
}

export const useDatabrowserRootRef = () => {
  const { rootRef } = useDatabrowser()
  return rootRef
}

const useDatabrowser = (): DatabrowserContextProps => {
  const context = useContext(DatabrowserContext)
  if (!context) {
    throw new Error("useDatabrowser must be used within a DatabrowserProvider")
  }
  return context
}

export const useDatabrowserStore = () => {
  const { store } = useDatabrowser()

  return useStore(store)
}

export type SearchFilter = {
  key: string
  type: DataType | undefined
}

export type SelectedItem = {
  key: string
  isNew?: boolean
}

export type TabData = {
  selectedKey: string | undefined
  selectedListItem?: SelectedItem

  search: SearchFilter
  pinned?: boolean
}

export type TabId = string & { __tabId: true }

type DatabrowserStore = {
  selectedTab: TabId | undefined
  tabs: [TabId, TabData][]

  addTab: () => TabId
  removeTab: (id: TabId) => void
  forceRemoveTab: (id: TabId) => void
  selectTab: (id: TabId) => void
  reorderTabs: (oldIndex: number, newIndex: number) => void

  // Tab context menu actions
  togglePinTab: (id: TabId) => void
  duplicateTab: (id: TabId) => TabId | undefined
  closeOtherTabs: (id: TabId) => void
  closeAllButPinned: () => void

  // Tab actions
  getSelectedKey: (tabId: TabId) => string | undefined
  setSelectedKey: (tabId: TabId, key: string | undefined) => void
  setSelectedListItem: (tabId: TabId, item?: { key: string; isNew?: boolean }) => void
  setSearch: (tabId: TabId, search: SearchFilter) => void
  setSearchKey: (tabId: TabId, key: string) => void
  setSearchType: (tabId: TabId, type: DataType | undefined) => void

  searchHistory: string[]
  addSearchHistory: (key: string) => void
}

export type DatabrowserStoreObject = UseBoundStore<StoreApi<DatabrowserStore>>

const storeCreator: StateCreator<DatabrowserStore> = (set, get) => ({
  selectedTab: undefined,
  tabs: [],

  addTab: () => {
    const id = crypto.randomUUID() as TabId

    const newTabData: TabData = {
      selectedKey: undefined,
      search: { key: "", type: undefined },
      pinned: false,
    }

    set((old) => ({
      tabs: [...old.tabs, [id, newTabData]],
      selectedTab: id,
    }))

    return id
  },

  reorderTabs: (oldIndex, newIndex) => {
    set((old) => {
      // Don't allow reordering pinned tabs
      const [, oldTabData] = old.tabs[oldIndex]
      const [, newTabData] = old.tabs[newIndex]
      if (oldTabData.pinned || newTabData.pinned) return old

      const newTabs = [...old.tabs]
      const [movedTab] = newTabs.splice(oldIndex, 1)
      newTabs.splice(newIndex, 0, movedTab)
      return { ...old, tabs: newTabs }
    })
  },

  removeTab: (id) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([tabId]) => tabId === id)
      if (tabIndex === -1) return old

      // Don't remove pinned tabs via X button
      const [, tabData] = old.tabs[tabIndex]
      if (tabData.pinned) return old

      const newTabs = [...old.tabs]
      newTabs.splice(tabIndex, 1)

      // If we're removing the selected tab, select the tab to the left
      let selectedTab = old.selectedTab
      if (selectedTab === id) {
        const [newId] = newTabs[tabIndex - 1] ?? newTabs[tabIndex]

        selectedTab = newTabs.length > 0 ? newId : undefined
      }

      return { tabs: newTabs, selectedTab }
    })
  },

  forceRemoveTab: (id) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([tabId]) => tabId === id)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      newTabs.splice(tabIndex, 1)

      // If we're removing the selected tab, select the tab to the left
      let selectedTab = old.selectedTab
      if (selectedTab === id) {
        const [newId] = newTabs[tabIndex - 1] ?? newTabs[tabIndex]

        selectedTab = newTabs.length > 0 ? newId : undefined
      }

      return { tabs: newTabs, selectedTab }
    })
  },

  togglePinTab: (id) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([tabId]) => tabId === id)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [tabId, tabData] = newTabs[tabIndex]
      newTabs[tabIndex] = [tabId, { ...tabData, pinned: !tabData.pinned }]

      return { ...old, tabs: newTabs }
    })
  },

  duplicateTab: (id) => {
    let newId: TabId | undefined
    set((old) => {
      const tabIndex = old.tabs.findIndex(([tabId]) => tabId === id)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [, tabData] = newTabs[tabIndex]
      newId = crypto.randomUUID() as TabId
      const duplicated: [TabId, TabData] = [newId, { ...tabData }]

      // Insert right after the original tab
      newTabs.splice(tabIndex + 1, 0, duplicated)

      return { ...old, tabs: newTabs, selectedTab: newId }
    })
    return newId
  },

  closeOtherTabs: (id) => {
    set((old) => {
      const exists = old.tabs.some(([tabId]) => tabId === id)
      if (!exists) return old

      const newTabs: [TabId, TabData][] = old.tabs.filter(([tabId]) => tabId === id)
      return { ...old, tabs: newTabs, selectedTab: id }
    })
  },

  closeAllButPinned: () => {
    set((old) => {
      const newTabs = old.tabs.filter(([, data]) => data.pinned)
      const newSelected = newTabs.length > 0 ? newTabs[0][0] : undefined
      return { ...old, tabs: newTabs, selectedTab: newSelected }
    })
  },

  selectTab: (id) => {
    set({ selectedTab: id })
  },

  getSelectedKey: (tabId) => {
    return get().tabs.find(([id]) => id === tabId)?.[1]?.selectedKey
  },

  setSelectedKey: (tabId, key) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([id]) => id === tabId)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [, tabData] = newTabs[tabIndex]
      newTabs[tabIndex] = [tabId, { ...tabData, selectedKey: key, selectedListItem: undefined }]

      return { ...old, tabs: newTabs }
    })
  },

  setSelectedListItem: (tabId, item) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([id]) => id === tabId)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [, tabData] = newTabs[tabIndex]
      newTabs[tabIndex] = [tabId, { ...tabData, selectedListItem: item }]

      return { ...old, tabs: newTabs }
    })
  },

  setSearch: (tabId, search) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([id]) => id === tabId)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [, tabData] = newTabs[tabIndex]
      newTabs[tabIndex] = [tabId, { ...tabData, search }]

      return { ...old, tabs: newTabs }
    })
  },

  setSearchKey: (tabId, key) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([id]) => id === tabId)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [, tabData] = newTabs[tabIndex]
      newTabs[tabIndex] = [
        tabId,
        {
          ...tabData,
          search: { ...tabData.search, key },
        },
      ]

      return { ...old, tabs: newTabs }
    })
  },

  setSearchType: (tabId, type) => {
    set((old) => {
      const tabIndex = old.tabs.findIndex(([id]) => id === tabId)
      if (tabIndex === -1) return old

      const newTabs = [...old.tabs]
      const [, tabData] = newTabs[tabIndex]
      newTabs[tabIndex] = [
        tabId,
        {
          ...tabData,
          search: { ...tabData.search, type },
        },
      ]

      return { ...old, tabs: newTabs }
    })
  },

  searchHistory: [],
  addSearchHistory: (key) => {
    set((old) => ({ ...old, searchHistory: [key, ...old.searchHistory] }))
  },
})
