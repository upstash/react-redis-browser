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
  return <RedisBrowser url={UPSTASH_REDIS_REST_URL} token={UPSTASH_REDIS_REST_TOKEN} />
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

---

## Codebase Internals

### Query Data Flow (UI ↔ Code ↔ Store ↔ Redis)

The query is stored in the zustand store as a **JS object literal string** (not JSON — keys are unquoted like `$and:` instead of `"$and":`). This single string is the shared source of truth between both the UI query builder and the code editor.

**Store shape:** `ValuesSearchFilter.queries` is a `Record<string, string>` mapping `indexName → queryString`. Each index remembers its own query independently.

**Code editor flow (`query-builder.tsx`):** Prepends `"const query: Query = "` to the stored string for Monaco. On edit, strips that prefix and writes the raw string to the store. Monaco gets type definitions generated from the index schema, giving autocomplete.

**UI query builder flow:** The UI works with a tree (`QueryState` — groups and conditions with IDs). `useQueryStateSync` handles bidirectional sync:

- **Store → tree:** `parseQueryString` (`query-parser.ts`) parses the string into `QueryNode`s. Runs on mount and when the store query changes externally (e.g. user edited in code mode then switched to UI).
- **Tree → store:** When the UI mutates the tree, `stringifyQueryState` (`query-stringify.ts`) converts back to a string and writes to the store.
- **Sync guard:** `isOurUpdate` ref prevents the hook from re-parsing its own writes. Only external changes trigger re-parsing.

**Limitation:** `$must`/`$should` combination is not supported in the UI builder — `hasMustShouldCombination` check blocks switching to UI mode when this pattern exists. The UI normalizes `$must`→`$and` and `$should`→`$or`.

**Store → Redis:** `KeysProvider` (`use-keys.tsx`) reads `valuesSearch.query` from the store, parses it with `parseJSObjectLiteral` into a plain object, and passes it as the `filter` to `redis.search.index().query()`.

### Schema Data Flow

Schemas define the structure of a search index. Two formats exist:

- **API format** — flat, dot-notation keys: `{ "name": "TEXT", "contact.email": "TEXT" }`
- **Editor format** — nested TypeScript builder DSL: `s.object({ name: s.string(), contact: s.object({ email: s.string() }) })`

`parseSchemaFromEditorValue` (`schema-parser.ts`) converts editor → API by recursively walking the builder calls, flattening nested `s.object()` calls into dot-separated keys, and mapping `s.string()` → `"TEXT"`, `s.number()` → `"F64"`, etc.

`schemaToEditorValue` converts API → editor by unflattening dot-notation keys into a nested object, then rendering back to the builder DSL.

`generateSchemaTypeDefinitions` produces TypeScript class declarations (the `s` builder, field builders, `Schema` type) that are injected into Monaco for autocomplete in the schema editor. The type definitions in `search-types-file.ts` mirror the `@upstash/redis` SDK types.

### UI Query Builder Mutations

All mutations go through `QueryBuilderUIProvider` (`query-builder-context.tsx`), which exposes four operations via context: `updateNode`, `deleteNode`, `addChildToGroup`, `moveNode`.

Every node in the tree has a unique `id`. All operations traverse the tree by ID, apply the change immutably, and return a new tree. The flow: component calls e.g. `updateNode(id, updates)` → `setQueryState` from `useQueryStateSync` receives a modifier → modifier gets a `structuredClone` of current state → tree is modified → result is stringified and written to the zustand store.

### Drag-and-Drop in the UI Query Builder

Uses `@dnd-kit/core`. Files: `dnd-context.tsx`, `draggable-item.tsx`, `drop-zone.tsx`, `drag-overlay.tsx`.

**Components and responsibilities:**

- **`DraggableItem`** — wraps each condition row and group row, provides the drag handle
- **`DropIndicator`** (`drop-zone.tsx`) — a thin horizontal line rendered _between_ each child in a group. Each one is a droppable zone.
- **`EmptyGroupDropZone`** (`drop-zone.tsx`) — rendered inside empty groups as a dashed "Add a condition" button that also accepts drops
- **`QueryDragOverlay`** — portal overlay showing a preview of the dragged node while dragging
- **`QueryDndProvider`** (`dnd-context.tsx`) — wraps the tree, owns the `@dnd-kit` `DndContext`, handles all drag events

**How drop zones work:** `QueryGroup` renders a `DropIndicator` before each child and one at the end. Each drop zone has an ID following the pattern `drop-{groupId}-{childId}` (insert before that child) or `drop-{groupId}-end` (append). This encoding lets `onDragEnd` know both _which group_ and _which position_ to insert at by just parsing the drop zone ID.

On drop, `dnd-context.tsx` resolves the source/target from the IDs, handles edge cases (no-op for same position, prevents dropping a group into its own descendants), and calls `moveNode` from the query builder context.

### Keys List (`useKeys`)

`KeysProvider` wraps `DatabrowserInstance` and provides fetched keys via `useKeys()`. It's at root level because multiple children need it: the **sidebar** renders the key list, and the **data display** uses `useKeyType(selectedKey)` (which looks up the type from the fetched keys array) to decide which editor to render for the selected key, and uses `query.isLoading` to show a loading state.

**Dual-mode fetching** based on `isValuesSearchSelected`:

1. **Standard Redis SCAN:** Sends `SCAN` commands with optional `MATCH` pattern and `TYPE` filter. When SCAN returns empty pages (sparse databases + type filters), retries with increasing `COUNT` (`100 → 300 → 500`) to reduce round trips.

2. **Redis Search:** Calls `redis.search.index().query()` with the parsed filter object from the store, offset-based pagination, and `select: {}` (returns only keys + scores).

Uses React Query's `useInfiniteQuery` for cursor-based pagination. Key types from the scan are cached individually so `useFetchKeyType` (used elsewhere) doesn't need extra `TYPE` commands. Results are deduplicated since Redis SCAN can return duplicates across pages.
