# RedisBrowser for Upstash Redis

`@upstash/react-redis-browser` is a React component that provides a UI for browsing and editing data in your Upstash Redis instances. It’s easy to set up and integrate into your React applications. This guide will help you get started with the installation and basic usage.

## Table of Contents

- [Install](#1-install)
- [Configuration](#2-configuration)
- [Usage](#3-usage)

## 1. Install

Install the databrowser component via npm:

```sh-session
$ npm install @upstash/react-redis-browser
```

## 2. Configuration

### Environment Variables

Configure your Upstash Redis REST URL and token as environment variables:

```sh-session
NEXT_PUBLIC_UPSTASH_REDIS_REST_URL=YOUR_REDIS_REST_URL
NEXT_PUBLIC_UPSTASH_REDIS_REST_TOKEN=YOUR_REDIS_REST_TOKEN
```

## 3. Usage

### Creating the Data Browser Component

In your React application, create a new component that will utilize @upstash/react-redis-browser.

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
