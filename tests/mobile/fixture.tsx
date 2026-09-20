import { createRoot } from "react-dom/client"

import { RedisBrowser } from "../../src/components/databrowser"

// This fixture deliberately never reads environment credentials or saved storage.
createRoot(document.querySelector("#root")!).render(
  <RedisBrowser
    url="https://mobile-test.invalid"
    token="mock-token"
    tabType="keys"
    disableTelemetry
  />
)
