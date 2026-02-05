import { useEffect, useState } from "react"
import type { DarkModeOption } from "@/dark-mode-context"
import { CredentialsForm } from "@/playground/credentials-form"
import { useCredentialsStore } from "@/playground/credentials-store"
import { IconMoon, IconSun } from "@tabler/icons-react"
import ReactDOM from "react-dom/client"

import { RedisBrowser } from "@/components/databrowser"

const safeEnv =
  typeof process !== "undefined" && process && typeof process.env === "object" ? process.env : {}

const App = () => {
  const { credentials } = useCredentialsStore()
  const [theme, setTheme] = useState<DarkModeOption>("light")

  useEffect(() => {
    if (safeEnv.UPSTASH_REDIS_REST_URL && safeEnv.UPSTASH_REDIS_REST_TOKEN) {
      useCredentialsStore.setState({
        credentials: {
          url: safeEnv.UPSTASH_REDIS_REST_URL,
          token: safeEnv.UPSTASH_REDIS_REST_TOKEN,
        },
      })
    }
  }, [safeEnv.UPSTASH_REDIS_REST_URL, safeEnv.UPSTASH_REDIS_REST_TOKEN])

  const toggleDarkMode = () => {
    setTheme((prev) => (prev === "light" ? "dark" : "light"))
  }

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: theme === "dark" ? "#18181b" : "rgb(var(--color-zinc-50))",
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
              borderColor: theme === "dark" ? "#3f3f46" : "#d4d4d8",
              borderRadius: "6px",
              backgroundColor: theme === "dark" ? "#27272a" : "#ffffff",
              color: theme === "dark" ? "#fafafa" : "#18181b",
              cursor: "pointer",
              fontSize: "14px",
              fontWeight: "500",
              transition: "all 0.2s",
            }}
          >
            {theme === "dark" ? <IconMoon size={20} /> : <IconSun size={20} />}
          </button>
        </div>
        <div style={{ height: "640px" }}>
          {credentials ? (
            <RedisBrowser
              onFullScreenClick={() => {
                // eslint-disable-next-line no-console
                console.log("Fullscreen button clicked")
              }}
              storage={{
                get: () => localStorage.getItem("redis-browser-data") || "",
                set: (value) => localStorage.setItem("redis-browser-data", value),
              }}
              token={credentials.token}
              url={credentials.url}
              theme={theme}
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
