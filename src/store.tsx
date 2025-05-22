import { createContext, useContext, useMemo, type PropsWithChildren } from "react"
import { create, useStore } from "zustand"

import type { DataType } from "./types"

// Re-export for backward compatibility
export type { RedisCredentials } from "./redis-context"

type DatabrowserContextProps = {
  store: DatabrowserStoreObject
}

const DatabrowserContext = createContext<DatabrowserContextProps | undefined>(undefined)

export const DatabrowserProvider = ({ children }: PropsWithChildren) => {
  const store = useMemo(() => createDatabrowserStore(), [])

  return <DatabrowserContext.Provider value={{ store }}>{children}</DatabrowserContext.Provider>
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

type TabData = {
  selectedKey: string | undefined
  selectedListItem?: SelectedItem

  search: SearchFilter
}

export type TabId = string & { __tabId: true }

type DatabrowserStore = {
  selectedTab: TabId | undefined
  tabs: Record<TabId, TabData>

  addTab: () => void
  removeTab: (id: TabId) => void
  selectTab: (id: TabId) => void

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

export type DatabrowserStoreObject = ReturnType<typeof createDatabrowserStore>

export const createDatabrowserStore = () =>
  create<DatabrowserStore>((set, get) => ({
    selectedTab: undefined,
    tabs: {},

    addTab: () => {
      const id = crypto.randomUUID() as TabId

      const newTabData: TabData = {
        selectedKey: undefined,
        search: { key: "", type: undefined },
      }

      set((old) => ({
        tabs: { ...old.tabs, [id]: newTabData },
        selectedTab: old.selectedTab === undefined ? id : old.selectedTab,
      }))
    },

    removeTab: (id) => {
      set((old) => {
        const newTabs = { ...old.tabs }
        delete newTabs[id]

        // If we're removing the selected tab, select another tab if available
        let selectedTab = old.selectedTab
        if (selectedTab === id) {
          const tabIds = Object.keys(newTabs) as TabId[]
          selectedTab = tabIds.length > 0 ? tabIds[0] : undefined
        }

        return { tabs: newTabs, selectedTab }
      })
    },

    selectTab: (id) => {
      set({ selectedTab: id })
    },

    getSelectedKey: (tabId) => {
      return get().tabs[tabId]?.selectedKey
    },

    setSelectedKey: (tabId, key) => {
      set((old) => ({
        ...old,
        tabs: {
          ...old.tabs,
          [tabId]: { ...old.tabs[tabId], selectedKey: key, selectedListItem: undefined },
        },
      }))
    },

    setSelectedListItem: (tabId, item) => {
      set((old) => ({
        ...old,
        tabs: { ...old.tabs, [tabId]: { ...old.tabs[tabId], selectedListItem: item } },
      }))
    },

    setSearch: (tabId, search) =>
      set((old) => ({ ...old, tabs: { ...old.tabs, [tabId]: { ...old.tabs[tabId], search } } })),
    setSearchKey: (tabId, key) =>
      set((old) => ({
        ...old,
        tabs: {
          ...old.tabs,
          [tabId]: { ...old.tabs[tabId], search: { ...old.tabs[tabId].search, key } },
        },
      })),
    setSearchType: (tabId, type) =>
      set((old) => ({
        ...old,
        tabs: {
          ...old.tabs,
          [tabId]: { ...old.tabs[tabId], search: { ...old.tabs[tabId].search, type } },
        },
      })),

    searchHistory: [],
    addSearchHistory: (key) => {
      set((old) => ({ ...old, searchHistory: [key, ...old.searchHistory] }))
    },
  }))
