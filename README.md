# RedisBrowser for Upstash Redis

`@upstash/react-redis-browser` is a React component that provides a UI for browsing and editing data in your Upstash Redis instances.

### Install

Install the databrowser component via npm:

```bash
$ npm install @upstash/react-redis-browser
```

### Usage

Here's a basic example of how to use the component:

```tsx
import { RedisBrowser } from "@upstash/react-redis-browser"
import "@upstash/react-redis-browser/dist/index.css"

export default function RedisBrowserDemo() {
  return (
    <main style={mainStyle}>
      <RedisBrowser 
        url={UPSTASH_REDIS_REST_URL} 
        token={UPSTASH_REDIS_REST_TOKEN} />
    </main>
  )
}

const mainStyle = {
  width: "100vw",
  maxWidth: "900px",
  height: "500px",
  margin: "0 auto",
}
