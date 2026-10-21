import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"

// react-dom checks for a DOM when it is loaded, so everything rendering is imported below
GlobalRegistrator.register()
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

// Index schemas by name. A missing schema is still loading.
let schemas: Record<string, Record<string, { type: string }>> = {}
const schemaListeners = new Set<() => void>()
const loadSchema = (index: string, schema: Record<string, { type: string }>) => {
  schemas = { ...schemas, [index]: schema }
  for (const listener of schemaListeners) listener()
}

mock.module("../../hooks/use-fetch-search-index", () => ({
  FETCH_SEARCH_INDEX_QUERY_KEY: "fetch-search-index",
  useFetchSearchIndex: (index?: string) => {
    const all = React.useSyncExternalStore(
      (listener) => {
        schemaListeners.add(listener)
        return () => schemaListeners.delete(listener)
      },
      () => schemas
    )
    const schema = index ? all[index] : undefined
    return { data: schema ? { schema } : undefined }
  },
}))

const React = await import("react")
const { act } = await import("react")
const { createRoot } = await import("react-dom/client")
const { DatabrowserProvider, useDatabrowserStore } = await import("@/store")
const { TabIdProvider } = await import("@/tab-provider")
const { TooltipProvider } = await import("@/components/ui/tooltip")
const { UIQueryBuilder } = await import("./ui-query-builder")
const { parseJSObjectLiteral, toJsLiteral } = await import("@/lib/utils")

/** A query as the builder formats it */
const fmt = (query: string) => toJsLiteral(parseJSObjectLiteral(query))

type Store = ReturnType<typeof useDatabrowserStore>

let store: Store
let showBuilder: (show: boolean) => void
let unsupported: string[] = []

const Harness = () => {
  store = useDatabrowserStore()
  const [show, setShow] = React.useState(false)
  showBuilder = setShow
  const onUnsupportedQuery = React.useCallback((error: string) => unsupported.push(error), [])
  if (!store.selectedTab || !show) return null
  return (
    <TooltipProvider>
      <TabIdProvider value={store.selectedTab}>
        <UIQueryBuilder onUnsupportedQuery={onUnsupportedQuery} />
      </TabIdProvider>
    </TooltipProvider>
  )
}

const container = document.createElement("div")
document.body.append(container)
const root = createRoot(container)
const rootRef = { current: container }

afterAll(async () => {
  await act(async () => root.unmount())
  await GlobalRegistrator.unregister()
})

const tab = () => store.tabs[0]
const tabId = () => tab()[0]
const stored = (index: string) => ({
  query: tab()[1].valuesSearch.queries[index],
  writtenBy: tab()[1].valuesSearch.queryWrittenBy?.[index],
})

/** Stores a query for an index, as written by the given editor */
const setQuery = async (index: string, query: string, writtenBy: "ui" | "code") => {
  await act(async () => {
    store.setValuesSearchIndex(tabId(), index)
    store.setValuesSearchQuery(tabId(), query, writtenBy)
  })
}

const switchIndex = async (index: string) => {
  await act(async () => store.setValuesSearchIndex(tabId(), index))
}

const mount = async () => {
  await act(async () => showBuilder(true))
}

beforeEach(async () => {
  schemas = {}
  unsupported = []
  // A fresh store for every test
  await act(async () => root.render(<React.Fragment key={Math.random()} />))
  await act(async () =>
    root.render(
      <DatabrowserProvider key={Math.random()} rootRef={rootRef}>
        <Harness />
      </DatabrowserProvider>
    )
  )
  await act(async () => {
    store.addTab()
  })
})

describe("UIQueryBuilder", () => {
  test("switching to an index whose typed query the builder refuses leaves it unchanged", async () => {
    loadSchema("B", { price: { type: "F64" } })
    await setQuery("B", `{ price: { $gte: 10, $lte: 100 } }`, "code")
    // A's schema is still loading, so its builder query is not normalized yet
    await setQuery("A", fmt(`{ a: "x" }`), "ui")
    await mount()

    await switchIndex("B")

    expect(stored("B")).toEqual({ query: `{ price: { $gte: 10, $lte: 100 } }`, writtenBy: "code" })
    expect(stored("A")).toEqual({ query: fmt(`{ a: "x" }`), writtenBy: "ui" })
    expect(unsupported.length).toBe(1)
  })

  test("switching to an index with a typed query the builder accepts leaves it unchanged", async () => {
    loadSchema("B", { name: { type: "TEXT" } })
    await setQuery("B", `{ name: { $smart: "a" } }`, "code")
    await setQuery("A", fmt(`{ a: "x" }`), "ui")
    await mount()

    await switchIndex("B")

    expect(stored("B")).toEqual({ query: `{ name: { $smart: "a" } }`, writtenBy: "code" })
    expect(unsupported).toEqual([])
  })

  test("a typed query is not normalized to the field types", async () => {
    loadSchema("A", { active: { type: "BOOL" }, name: { type: "TEXT" }, n: { type: "U64" } })
    for (const query of [`{ active: 1 }`, `{ name: true }`, `{ n: "5" }`]) {
      await setQuery("A", query, "code")
      await mount()
      expect(stored("A")).toEqual({ query, writtenBy: "code" })
      await act(async () => showBuilder(false))
    }
  })

  test("a query stored without a tag (by older versions) is never rewritten", async () => {
    loadSchema("B", { price: { type: "F64" } })
    const query = `{ price: { $gte: 10, $lte: 100 } }`
    await act(async () =>
      store.setValuesSearch(tabId(), { index: "B", queries: { B: query }, queryBuilderMode: "ui" })
    )
    await mount()

    expect(stored("B")).toEqual({ query, writtenBy: undefined })
    expect(unsupported.length).toBe(1)
  })

  test("a builder query is normalized once the schema loads", async () => {
    await setQuery("A", fmt(`{ n: "5", active: "true" }`), "ui")
    await mount()
    expect(stored("A").query).toBe(fmt(`{ n: "5", active: "true" }`))

    await act(async () => loadSchema("A", { n: { type: "U64" }, active: { type: "BOOL" } }))

    expect(stored("A")).toEqual({ query: fmt(`{ n: 5, active: true }`), writtenBy: "ui" })
  })

  test("a builder query is normalized with its own index's schema after a switch", async () => {
    loadSchema("B", { n: { type: "U64" } })
    await setQuery("B", fmt(`{ n: "5" }`), "ui")
    await setQuery("A", fmt(`{ a: "x" }`), "ui")
    await mount()

    await switchIndex("B")

    expect(stored("B")).toEqual({ query: fmt(`{ n: 5 }`), writtenBy: "ui" })
    expect(stored("A")).toEqual({ query: fmt(`{ a: "x" }`), writtenBy: "ui" })
  })
})

describe("setValuesSearchQuery", () => {
  test("writing an unchanged query keeps the editor that wrote it", async () => {
    await setQuery("A", `{ a: "x" }`, "ui")
    await act(async () => store.setValuesSearchQuery(tabId(), `{ a: "x" }`, "code"))
    expect(stored("A")).toEqual({ query: `{ a: "x" }`, writtenBy: "ui" })

    await act(async () => store.setValuesSearchQuery(tabId(), `{ a: "y" }`, "code"))
    expect(stored("A")).toEqual({ query: `{ a: "y" }`, writtenBy: "code" })
  })
})
