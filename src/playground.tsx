import ReactDOM from "react-dom/client"

import { RedisBrowser } from "@/components/databrowser"

ReactDOM.createRoot(document.querySelector("#root")!).render(
  <main className="mx-auto flex h-[600px] max-h-full max-w-screen-lg items-center justify-center p-10">
    <RedisBrowser
      token={process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN}
      url={process.env.NEXT_PUBLIC_UPSTASH_REDIS_REST_URL}
    />
  </main>
)
