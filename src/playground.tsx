import ReactDOM from "react-dom/client"

import { RedisBrowser } from "@/components/databrowser"

ReactDOM.createRoot(document.querySelector("#root")!).render(
    <main
        style={{
          height: "500px",
          width: "100vw",
          maxWidth: "900px",
          margin: "0 auto",
          padding: "20px",
        }}
    >
    <RedisBrowser
      token={process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN}
      url={process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL}
    />
  </main>
)
