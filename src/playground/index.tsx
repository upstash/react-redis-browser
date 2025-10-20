import ReactDOM from "react-dom/client"
import { RedisBrowser } from "@/components/databrowser"
import { CredentialsForm } from "@/playground/credentials-form"
import { useCredentialsStore } from "@/playground/credentials-store"
import { useEffect } from "react"

const safeProcess = typeof process === "undefined" ? { env: {} as Record<string, string> } : process

const App = () => {
  const { credentials } = useCredentialsStore()

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

  return (
    <main
      style={{
        position: "fixed",
        inset: 0,
        backgroundColor: "white",
        padding: "20px",
      }}
    >
      <div
        style={{
          height: "800px",
          maxWidth: "900px",
          boxSizing: "border-box",
          margin: "0 auto",
        }}
        className="ups-db"
      >
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
          />
        ) : (
          <CredentialsForm />
        )}
      </div>
    </main>
  )
}

ReactDOM.createRoot(document.querySelector("#root")!).render(<App />)
