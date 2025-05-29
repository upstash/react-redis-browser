import { create } from "zustand"
import { persist } from "zustand/middleware"
import type { RedisCredentials } from "../redis-context"

interface CredentialsState {
  credentials: RedisCredentials | null
  setCredentials: (credentials: RedisCredentials) => void
}

export const useCredentialsStore = create<CredentialsState>()(
  persist(
    (set) => ({
      credentials: null,
      setCredentials: (credentials) => set({ credentials }),
    }),
    {
      name: "redis-credentials",
    }
  )
)
