# Redis Browser for Upstash Redis - [Preview](https://react-redis-browser.vercel.app/)
`@upstash/react-redis-browser` is a React component that provides a UI for browsing and editing data in your Upstash Redis instances.

<img src="https://github.com/user-attachments/assets/1b714616-310b-4250-9f92-cc28ed9881cd" width="640px" />

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

export default function Page() {
  return (
    <RedisBrowser
      url={UPSTASH_REDIS_REST_URL}
      token={UPSTASH_REDIS_REST_TOKEN}
    />
  )
}
```

### Persistance

The state of the databrowser can be persisted using the `storage` property.

```tsx
import { RedisBrowser } from "@upstash/react-redis-browser"
import "@upstash/react-redis-browser/dist/index.css"

export default function Page() {
  return (
    <RedisBrowser
      url={UPSTASH_REDIS_REST_URL}
      token={UPSTASH_REDIS_REST_TOKEN}
      storage={{
        get: () => localStorage.getItem("databrowser") || "",
        set: (value) => localStorage.setItem("databrowser", value),
      }}
    />
  )
}
```
