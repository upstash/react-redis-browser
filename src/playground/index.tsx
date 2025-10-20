import ReactDOM from "react-dom/client"
import { RedisBrowser } from "@/components/databrowser"
import { CredentialsForm } from "@/playground/credentials-form"
import { useCredentialsStore } from "@/playground/credentials-store"
import { useEffect, useState } from "react"
import type { DarkModeOption } from "@/dark-mode-context"
import { IconMoon, IconSun } from "@tabler/icons-react"

const safeProcess = typeof process === "undefined" ? { env: {} as Record<string, string> } : process

const App = () => {
  const { credentials } = useCredentialsStore()
  const [darkMode, setDarkMode] = useState<DarkModeOption>("light")

  useEffect(() => {
    if (safeProcess.env.UPSTASH_REDIS_REST_URL && safeProcess.env.UPSTASH_REDIS_REST_TOKEN) {
      useCredentialsStore.setState({
        credentials: {
          url: safeProcess.env.UPSTASH_REDIS_REST_URL,
          token: safeProcess.env.UPSTASH_REDIS_REST_TOKEN,
        },
      })
    }
  }, [safeProcess.env.UPSTASH_REDIS_REST_URL, safeProcess.env.UPSTASH_REDIS_REST_TOKEN])

  const toggleDarkMode = () => {
    setDarkMode((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <main
      className="ups-db"
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: darkMode === "dark" ? "#18181b" : "rgb(var(--color-zinc-50))",
        padding: "20px",
        transition: "background-color 0.2s",
      }}
    >
      <div
        style={{
          maxWidth: "900px",
          margin: "0 auto",
        }}
      >
        <div
          style={{
            display: "flex",
            justifyContent: "flex-end",
            marginBottom: "12px",
          }}
        >
          <button
            onClick={toggleDarkMode}
            style={{
              padding: "8px",
              border: "1px solid",
              borderColor: darkMode === "dark" ? "#3f3f46" : "#d4d4d8",
              borderRadius: "6px",
              backgroundColor: darkMode === "dark" ? "#27272a" : "#ffffff",
              color: darkMode === "dark" ? "#fafafa" : "#18181b",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            {darkMode === "dark" ? <IconMoon size={20} /> : <IconSun size={20} />}
          </button>
        </div>
        <div style={{ height: "800px" }}>
          {credentials ? (
            <RedisBrowser
              storage={{
                get: () => localStorage.getItem("redis-browser-data") || "",
                set: (value) => localStorage.setItem("redis-browser-data", value),
              }}
              token={credentials.token}
              url={credentials.url}
              darkMode={darkMode}
            />
          ) : (
            <CredentialsForm />
          )}
        </div>
      </div>
    </main>
  )
}

ReactDOM.createRoot(document.querySelector("#root")!).render(<App />)
