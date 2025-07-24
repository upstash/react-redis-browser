import { createContext, useContext, useMemo } from "react"

import type { SearchFilter, SelectedItem } from "./store"
import { useDatabrowserStore, type TabId } from "./store"
import type { DataType } from "./types"

const TabIdContext = createContext<TabId | undefined>(undefined)

export const TabIdProvider = ({ children, value }: { children: React.ReactNode; value: TabId }) => {
  return <TabIdContext.Provider value={value}>{children}</TabIdContext.Provider>
}

export const useTabId = () => {
  const tabId = useContext(TabIdContext)
  if (!tabId) {
    throw new Error("useTabId must be used within a TabProvider")
  }
  return tabId
}

export const useTab = () => {
  const {
    selectedTab,
    tabs,
    setSelectedKey,
    setSelectedListItem,
    setSearch,
    setSearchKey,
    setSearchType,
  } = useDatabrowserStore()
  const tabId = useTabId()
  const tabData = useMemo(() => tabs.find(([id]) => id === tabId)?.[1], [tabs, tabId])

  if (!selectedTab) throw new Error("selectedTab is undefined when using useTab()")
  if (!tabData) throw new Error("tabData is undefined when using useTab()")

  return useMemo(
    () => ({
      active: selectedTab === tabId,
      selectedKey: tabData.selectedKey,
      selectedListItem: tabData.selectedListItem,
      search: tabData.search,

      setSelectedKey: (key: string | undefined) => setSelectedKey(tabId, key),
      setSelectedListItem: (item: SelectedItem | undefined) => setSelectedListItem(tabId, item),
      setSearch: (search: SearchFilter) => setSearch(tabId, search),
      setSearchKey: (key: string) => setSearchKey(tabId, key),
      setSearchType: (type: DataType | undefined) => setSearchType(tabId, type),
    }),
    [selectedTab, tabs, tabId]
  )
}
