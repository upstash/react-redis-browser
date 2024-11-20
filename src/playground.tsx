import ReactDOM from "react-dom/client"

import { RedisBrowser } from "@/components/databrowser"

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <main
    style={{
      position: "fixed",
      inset: 0,
      backgroundColor: "#eee",
      padding: "20px",
    }}
  >
    <div
      style={{
        height: "500px",
        width: "100%",
        maxWidth: "900px",
        margin: "0 auto",
      }}
    >
      <RedisBrowser
        token={process.env.UPSTASH_REDIS_REST_TOKEN}
        url={process.env.UPSTASH_REDIS_REST_URL}
      />
    </div>
  </main>
)
