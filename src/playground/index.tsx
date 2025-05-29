import ReactDOM from "react-dom/client"
import { RedisBrowser } from "@/components/databrowser"
import { CredentialsForm } from "@/playground/credentials-form"
import { useCredentialsStore } from "@/playground/credentials-store"
import { useEffect } from "react"

const App = () => {
  const { credentials } = useCredentialsStore()

  useEffect(() => {
    if (process.env.UPSTASH_REDIS_REST_URL && process.env.UPSTASH_REDIS_REST_TOKEN) {
      useCredentialsStore.setState({
        credentials: {
          url: process.env.UPSTASH_REDIS_REST_URL,
          token: process.env.UPSTASH_REDIS_REST_TOKEN,
        },
      })
    }
  }, [process.env.UPSTASH_REDIS_REST_URL, process.env.UPSTASH_REDIS_REST_TOKEN])

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
          border: credentials ? "1px solid red" : "none",
          boxSizing: "border-box",
          margin: "0 auto",
        }}
        className="ups-db"
      >
        {credentials ? (
          <RedisBrowser token={credentials.token} url={credentials.url} />
        ) : (
          <CredentialsForm />
        )}
      </div>
    </main>
  )
}

ReactDOM.createRoot(document.querySelector("#root")!).render(<App />)
