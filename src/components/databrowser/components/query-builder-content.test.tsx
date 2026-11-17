import { GlobalRegistrator } from "@happy-dom/global-registrator"
import { afterAll, beforeEach, describe, expect, mock, test } from "bun:test"

// react-dom checks for a DOM when it is loaded, so everything rendering is imported below
GlobalRegistrator.register()
;(globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT = true

const schemas: Record<string, Record<string, { type: string }>> = {
  A: { name: { type: "TEXT" } },
  B: { name: { type: "TEXT" } },
}

// Module mocks outlive this file, so other test files get the real hooks
const fetchSearchIndex = await import("../hooks/use-fetch-search-index")
const realUseFetchSearchIndex = fetchSearchIndex.useFetchSearchIndex
const keys = await import("../hooks/use-keys")
const realUseKeys = keys.useKeys
const utils = await import("@/lib/utils")
const realIsTest = utils.isTest
let isMocked = true

// Render the plain test editor instead of Monaco
mock.module("@/lib/utils", () => ({
  ...utils,
  get isTest() {
    return isMocked || realIsTest
  },
}))

mock.module("../hooks/use-fetch-search-index", () => ({
  ...fetchSearchIndex,
  useFetchSearchIndex: (...args: Parameters<typeof realUseFetchSearchIndex>) => {
    if (!isMocked) return realUseFetchSearchIndex(...args)
    const schema = args[0] ? schemas[args[0]] : undefined
    return { data: schema ? { schema } : undefined }
  },
}))

mock.module("../hooks/use-keys", () => ({
  ...keys,
  useKeys: () => (isMocked ? { query: { error: undefined } } : realUseKeys()),
}))

const React = await import("react")
const { act } = await import("react")
const { createRoot } = await import("react-dom/client")
const { DatabrowserProvider, useDatabrowserStore } = await import("@/store")
const { TabIdProvider } = await import("@/tab-provider")
const { TooltipProvider } = await import("@/components/ui/tooltip")
const { QueryBuilderContent } = await import("./databrowser-instance")

type Store = ReturnType<typeof useDatabrowserStore>

let store: Store
let showContent: (show: boolean) => void

const Harness = () => {
  store = useDatabrowserStore()
  const [show, setShow] = React.useState(false)
  showContent = setShow
  if (!store.selectedTab || !show) return null
  return (
    <TooltipProvider>
      <TabIdProvider value={store.selectedTab}>
        <QueryBuilderContent />
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
  isMocked = false
  delete (globalThis as { IS_REACT_ACT_ENVIRONMENT?: boolean }).IS_REACT_ACT_ENVIRONMENT
})

const tab = () => store.tabs[0]
const tabId = () => tab()[0]
const stored = (index: string) => tab()[1].valuesSearch.queries[index]
const mode = () => tab()[1].valuesSearch.queryBuilderMode
const editorText = () =>
  container.querySelector<HTMLTextAreaElement>("textarea[aria-label='query-editor']")?.value

const setQuery = async (index: string, query: string) => {
  await act(async () => {
    store.setValuesSearchIndex(tabId(), index)
    store.setValuesSearchQuery(tabId(), query)
  })
}

beforeEach(async () => {
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

describe("QueryBuilderContent", () => {
  for (const query of ["[1]", `{ name: "x"`]) {
    test(`falling back to the code editor keeps an unsupported query (${query})`, async () => {
      await setQuery("B", query)
      await setQuery("A", `{ name: "a" }`)
      await act(async () => showContent(true))
      expect(mode()).toBe("ui")

      await act(async () => store.setValuesSearchIndex(tabId(), "B"))

      expect(mode()).toBe("code")
      expect(editorText()).toBe(`const query: Query = ${query}`)
      expect(stored("B")).toBe(query)
    })
  }
})
