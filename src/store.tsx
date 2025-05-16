import { createContext, useContext, useMemo, useState, type PropsWithChildren } from "react"
import type { Redis } from "@upstash/redis"
import { create, useStore } from "zustand"

import { redisClient } from "./lib/clients"
import type { DataType } from "./types"

export type RedisCredentials = {
  url?: string
  token?: string
}

type DatabrowserContextProps = {
  redis: Redis
  redisNoPipeline: Redis
  store: ReturnType<typeof createDatabrowserStore>
}

const DatabrowserContext = createContext<DatabrowserContextProps | undefined>(undefined)

interface DatabrowserProviderProps {
  redisCredentials: RedisCredentials
}

export const DatabrowserProvider = ({
  children,
  redisCredentials,
}: PropsWithChildren<DatabrowserProviderProps>) => {
  const redisInstance = useMemo(() => redisClient({credentials: redisCredentials, pipelining: true}), [redisCredentials])
  const redisInstanceNoPipeline = useMemo(() => redisClient({credentials: redisCredentials, pipelining: false}), [redisCredentials])

  const [store] = useState(() => {
    return createDatabrowserStore()
  })

  return (
    <DatabrowserContext.Provider value={{ redis: redisInstance, redisNoPipeline: redisInstanceNoPipeline, store }}>
      {children}
    </DatabrowserContext.Provider>
  )
}

export const useDatabrowser = (): DatabrowserContextProps => {
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

type DatabrowserStore = {
  selectedKey: string | undefined
  setSelectedKey: (key: string | undefined) => void

  selectedListItem?: SelectedItem
  setSelectedListItem: (item?: { key: string; isNew?: boolean }) => void

  search: SearchFilter
  setSearch: (search: SearchFilter) => void
  setSearchKey: (key: string) => void
  setSearchType: (type: DataType | undefined) => void
}

const createDatabrowserStore = () =>
  create<DatabrowserStore>((set) => ({
    selectedKey: undefined,
    setSelectedKey: (key) => {
      set((old) => ({ ...old, selectedKey: key, selectedListItem: undefined }))
    },

    selectedListItem: undefined,
    setSelectedListItem: (item) => {
      set((old) => ({ ...old, selectedListItem: item }))
    },

    search: { key: "", type: undefined },
    setSearch: (search) => set({ search }),
    setSearchKey: (key) => set((state) => ({ search: { ...state.search, key } })),
    setSearchType: (type) => set((state) => ({ search: { ...state.search, type } })),
  }))
