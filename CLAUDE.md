# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

`@upstash/react-redis-browser` is a React component library that provides a UI for browsing and editing data in Upstash Redis instances. It exports `RedisBrowser` and `RedisBrowserStorage` as its public API. Supports string, list, hash, set, sorted set, JSON, stream, and search index data types.

## Architecture

### Provider Stack (nested in this order)

`DarkModeProvider` → `RedisProvider` → `QueryClientProvider` → `DatabrowserProvider` → `TabIdProvider`

- **RedisProvider** (`src/redis-context.tsx`): Supplies pipelined and non-pipelined Redis client instances
- **DatabrowserProvider** (`src/store.tsx`): Zustand store for UI state (tabs, search, selections, filters)
- **TabIdProvider** (`src/tab-provider.tsx`): Current tab context; hooks `useTabId()` and `useTab()`

### State Management

- **Zustand** with persistence middleware manages tabs, key search, type filters, selections, and search history
- **React Query** handles server state (key lists, values, metadata)
- **Persistence:** Optional `RedisBrowserStorage` interface for localStorage/custom storage. Schema is at version 7 with automated migrations from earlier versions.

### Key Source Locations

- `src/index.ts` — Public exports
- `src/components/databrowser/index.tsx` — Root `RedisBrowser` component
- `src/components/databrowser/components/sidebar/` — Key list, search, filters
- `src/components/databrowser/components/search/` — Search index UI (create, query, schema editor)
- `src/components/databrowser/components/display/` — Data rendering per type
- `src/components/ui/` — shadcn/ui primitives (Radix-based)
- `src/lib/clients.ts` — Redis client initialization and QueryClient setup
- `src/playground/` — Local dev playground app

### CSS Namespacing

All generated CSS classes are prefixed with `.ups-db` via postcss-prefix-selector. Tailwind uses CSS variables for theming with class-based dark mode.

## Code Conventions

- **Semicolons:** Off (Prettier enforced)
- **Quotes:** Double quotes
- **Print width:** 100 characters
- **Import order:** Enforced by `@ianvs/prettier-plugin-sort-imports` — React first, then third-party, then types/config/lib/hooks, then components, then relative imports
- **Unused variables:** Prefix with `_` to suppress lint errors
- **No `console.log`:** Only `console.warn` and `console.error` allowed
- **No null:** Unicorn rule `no-null` is enabled
- **Type imports:** Use `import type` consistently (`consistent-type-imports` rule)
- **Pre-commit hooks:** Husky + lint-staged runs Prettier and ESLint --fix automatically
