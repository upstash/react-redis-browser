import { test as base, expect } from "@playwright/test"

const test = base.extend<{ searchMode: boolean }>({
  searchMode: [false, { option: true }],
})

const keys = Array.from({ length: 100 }, (_, index) => `customer:${String(index).padStart(3, "0")}`)
const hashKey = "customer:profile"
const fields = Array.from({ length: 60 }, (_, index) => `field-${index}`)
const longKey = `session:${"long-key-name-".repeat(8)}`

const encode = (value: unknown): unknown => {
  if (typeof value === "string") return Buffer.from(value).toString("base64")
  if (Array.isArray(value)) return value.map((item) => encode(item))
  return value
}

test.beforeEach(async ({ page, baseURL, searchMode }) => {
  await page.addInitScript(() => {
    ;(window as any).__PLAYWRIGHT__ = true
  })
  await page.route("**/*", async (route) => {
    const request = route.request()
    const url = new URL(request.url())
    if (url.origin === new URL(baseURL!).origin) return route.continue()
    // Nothing in these tests can contact a real Redis database.
    if (url.hostname !== "mobile-test.invalid") return route.abort()

    const execute = (command: unknown[]) => {
      const [name, key] = command.map(String)
      switch (name.toUpperCase()) {
        case "SCAN": {
          const matchIndex = command.indexOf("MATCH")
          const prefix = matchIndex >= 0 ? String(command[matchIndex + 1]).replaceAll("*", "") : ""
          const matching = [...keys, hashKey, longKey, ""].filter((key) => key.startsWith(prefix))
          const withType = command.includes("WITHTYPE")
          return [
            "0",
            withType
              ? matching.flatMap((key) => [key, key === hashKey ? "hash" : "string"])
              : matching,
          ]
        }
        case "SEARCH.LISTINDEXES": {
          return [["name", "idx_customers", "type", "STRING"]]
        }
        case "SEARCH.DESCRIBE": {
          return [
            "name",
            "idx_customers",
            "type",
            "STRING",
            "prefixes",
            ["customer:"],
            "language",
            "english",
            "schema",
            [["name", "TEXT"]],
          ]
        }
        case "SEARCH.QUERY": {
          return [[keys[0], "1", []]]
        }
        case "HSCAN": {
          return ["0", fields.flatMap((field) => [field, `Value for ${field}`])]
        }
        case "HLEN": {
          return fields.length
        }
        case "HTTL": {
          return Array.from({ length: Number(command[3]) }, () => -1)
        }
        case "GET": {
          return `Value for ${key}`
        }
        case "TYPE": {
          return "string"
        }
        case "TTL": {
          return -1
        }
        case "MEMORY": {
          return 128
        }
        case "SET": {
          return "OK"
        }
        default: {
          throw new Error(`Unexpected mocked command: ${name}`)
        }
      }
    }
    const body = request.postDataJSON()
    const result = Array.isArray(body[0])
      ? body.map((command: unknown[]) => ({ result: encode(execute(command)) }))
      : { result: encode(execute(body)) }
    await route.fulfill({ json: result })
  })
  await page.goto(`/tests/mobile/index.html${searchMode ? "?search" : ""}`)
  await expect(page.getByRole("button", { name: keys[0], exact: true })).toBeVisible()
})

test("touch opens a full-width detail, and Back restores list scroll", async ({ page }) => {
  const row = page.locator(`[data-key="${keys[40]}"]`)
  await row.scrollIntoViewIfNeeded()
  const scroll = page.locator("[data-radix-scroll-area-viewport]").first()
  const before = await scroll.evaluate((element) => element.scrollTop)
  expect(before).toBeGreaterThan(0)
  const box = await row.boundingBox()
  expect(box!.height).toBeGreaterThanOrEqual(44)
  await row.tap()
  await expect(page.getByRole("textbox", { name: "editor" })).toHaveValue(`Value for ${keys[40]}`)
  await expect(page.getByPlaceholder("Search")).not.toBeVisible()
  await expect(row).not.toBeVisible()
  await page.getByRole("button", { name: "Back to keys" }).tap()
  await expect(row).toBeVisible()
  expect(await scroll.evaluate((element) => element.scrollTop)).toBe(before)
  await row.tap()
  await expect(page.getByRole("textbox", { name: "editor" })).toHaveValue(`Value for ${keys[40]}`)
})

test("search, long key details, and create dialog fit a narrow phone", async ({ page }) => {
  await page.setViewportSize({ width: 320, height: 640 })
  const search = page.getByPlaceholder("Search")
  await search.fill("session:")
  await search.press("Enter")
  await page.getByRole("button", { name: longKey, exact: true }).tap()
  await expect(page.getByRole("textbox", { name: "editor" })).toHaveValue(`Value for ${longKey}`)
  expect(await page.evaluate(() => document.documentElement.scrollWidth)).toBe(320)
  await page.getByRole("button", { name: "Back to keys" }).tap()
  await expect(search).toHaveValue("session:*")
  await page.getByTestId("add-key-button").tap()
  const dialog = page.getByRole("dialog")
  await expect(dialog).toBeVisible()
  const box = await dialog.boundingBox()
  expect(box!.x).toBeGreaterThanOrEqual(0)
  expect(box!.x + box!.width).toBeLessThanOrEqual(320)
  await page.getByRole("button", { name: "Close", exact: true }).tap()
})

test("native mobile editing supports cancel and save", async ({ page }) => {
  await page.getByRole("button", { name: keys[0], exact: true }).tap()
  const editor = page.getByRole("textbox", { name: "editor" })
  await expect(editor).toHaveValue(`Value for ${keys[0]}`)
  await expect(editor).toHaveJSProperty("tagName", "TEXTAREA")
  await editor.fill("Updated\nmultiline value")
  await page.getByRole("button", { name: "Cancel", exact: true }).tap()
  await expect(editor).toHaveValue(`Value for ${keys[0]}`)
  await editor.fill("Updated value")
  const save = page.getByRole("button", { name: "Save", exact: true })
  await expect(save).toBeEnabled()
  const request = page.waitForRequest((request) => request.postData()?.includes('"set"') ?? false)
  await save.tap()
  await request
})

test("layout follows container width and preserves desktop split panes", async ({ page }) => {
  await page.setViewportSize({ width: 1200, height: 900 })
  const row = page.locator(`[data-key="${keys[0]}"]`)
  await row.click()
  await expect(page.getByRole("textbox", { name: "editor" })).toHaveValue(`Value for ${keys[0]}`)
  await expect(row).toBeVisible()
  await expect(page.getByRole("button", { name: "Back to keys" })).not.toBeVisible()
  await page.locator("#root").evaluate((element) => {
    element.style.width = "390px"
  })
  await expect(page.getByRole("button", { name: "Back to keys" })).toBeVisible()
  await expect(row).not.toBeVisible()
  await page.getByRole("button", { name: "Back to keys" }).click()
  await expect(row).toBeVisible()
})

test("hash rows remain tappable after scrolling and returning from the item editor", async ({
  page,
}) => {
  await page.getByPlaceholder("Search").fill(hashKey)
  await page.getByPlaceholder("Search").press("Enter")
  await page.getByRole("button", { name: hashKey, exact: true }).tap()
  const row = page.getByRole("row", { name: "field-40 Value for field-40", exact: true })
  await row.scrollIntoViewIfNeeded()
  const viewport = page.locator(".browser-detail [data-radix-scroll-area-viewport]").last()
  const before = await viewport.evaluate((element) => element.scrollTop)
  expect(before).toBeGreaterThan(0)
  await row.getByText("field-40", { exact: true }).tap()
  await expect(page.getByRole("textbox", { name: "editor" }).nth(1)).toHaveValue(
    "Value for field-40"
  )
  await page.getByRole("button", { name: "Cancel", exact: true }).tap()
  await expect(row).toBeVisible()
  expect(await viewport.evaluate((element) => element.scrollTop)).toBe(before)
  await row.getByText("field-40", { exact: true }).tap()
  await expect(page.getByRole("textbox", { name: "editor" }).nth(1)).toHaveValue(
    "Value for field-40"
  )
})

test("empty key names open on touch", async ({ page }) => {
  const row = page.getByRole("button", { name: "(Empty Key)", exact: true })
  await row.scrollIntoViewIfNeeded()
  await row.tap()
  await expect(page.getByRole("textbox", { name: "editor" })).toHaveValue("Value for ")
})

test("unsaved string edits survive rotation in both directions", async ({ page }) => {
  await page.getByRole("button", { name: keys[0], exact: true }).tap()
  const editor = page.getByRole("textbox", { name: "editor" })
  const draft = "Unsaved string draft"
  await editor.fill(draft)
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.getByRole("button", { name: "Back to keys" })).not.toBeVisible()
  await expect(editor).toHaveValue(draft)
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled()
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(editor).toHaveValue(draft)
  await page.getByRole("button", { name: "Cancel", exact: true }).tap()
  await expect(editor).toHaveValue(`Value for ${keys[0]}`)
})

test("unsaved hash field and value edits survive rotation", async ({ page }) => {
  await page.getByPlaceholder("Search").fill(hashKey)
  await page.getByPlaceholder("Search").press("Enter")
  await page.getByRole("button", { name: hashKey, exact: true }).tap()
  await page.getByRole("row", { name: "field-0 Value for field-0", exact: true }).tap()
  const editors = page.getByRole("textbox", { name: "editor" })
  await editors.nth(0).fill("renamed-field")
  await editors.nth(1).fill("Unsaved hash value")
  await page.setViewportSize({ width: 844, height: 390 })
  await expect(page.getByRole("button", { name: "Back to keys" })).not.toBeVisible()
  await expect(editors.nth(0)).toHaveValue("renamed-field")
  await expect(editors.nth(1)).toHaveValue("Unsaved hash value")
  await page.setViewportSize({ width: 390, height: 844 })
  await expect(editors.nth(0)).toHaveValue("renamed-field")
  await expect(editors.nth(1)).toHaveValue("Unsaved hash value")
  await expect(page.getByRole("button", { name: "Save", exact: true })).toBeEnabled()
})

test("Back resumes pagination after an in-flight page finishes while hidden", async ({ page }) => {
  const cursors: string[] = []
  let releaseSecondPage!: () => void
  const secondPage = new Promise<void>((resolve) => {
    releaseSecondPage = resolve
  })
  await page.route("https://mobile-test.invalid/**", async (route) => {
    const command = route.request().postDataJSON() as string[]
    if (
      typeof command[0] !== "string" ||
      command[0].toUpperCase() !== "SCAN" ||
      !command.includes("sparse:*")
    ) {
      return route.fallback()
    }
    const cursor = command[1]
    cursors.push(cursor)
    if (cursor === "1") await secondPage
    const nextCursor = cursor === "2" ? "0" : String(Number(cursor) + 1)
    await route.fulfill({
      json: { result: encode([nextCursor, [`sparse:00${cursor}`, "string"]]) },
    })
  })
  await page.getByPlaceholder("Search").fill("sparse:")
  await page.getByPlaceholder("Search").press("Enter")
  await expect.poll(() => cursors).toEqual(["0", "1"])
  await page.getByRole("button", { name: "sparse:000", exact: true }).tap()
  releaseSecondPage()
  await expect(page.locator('[data-key="sparse:001"]')).toBeAttached()
  // Allow the viewport-fill timer to run while the list is hidden.
  await page.waitForTimeout(250)
  expect(cursors).toEqual(["0", "1"])
  await page.getByRole("button", { name: "Back to keys" }).tap()
  await expect(page.getByRole("button", { name: "sparse:002", exact: true })).toBeVisible()
  expect(cursors).toEqual(["0", "1", "2"])
})

test.describe("search", () => {
  test.use({ searchMode: true })

  test("dynamic search panels retain their identities and resize after mode changes", async ({
    page,
  }) => {
    const warnings: string[] = []
    page.on("console", (message) => {
      if (message.type() === "warning" && message.text().includes("Panel id and order")) {
        warnings.push(message.text())
      }
    })
    await page.setViewportSize({ width: 1200, height: 900 })
    const results = page.locator('[data-panel-id^="panel-results-"]')
    await expect(results).toBeVisible()
    const resultId = await results.getAttribute("data-panel-id")
    for (let cycle = 0; cycle < 2; cycle++) {
      await page.getByRole("button", { name: "Search", exact: true }).click()
      const query = page.locator('[data-panel-id^="panel-query-"]')
      await expect(query).toBeVisible()
      await expect(page.getByRole("button", { name: "Index actions", exact: true })).toBeEnabled()
      await expect(results).toHaveAttribute("data-panel-id", resultId!)
      const before = await query.boundingBox()
      const handle = page.locator(
        '[data-panel-group-direction="vertical"] > [data-panel-resize-handle-id]'
      )
      const handleBox = await handle.boundingBox()
      await page.mouse.move(
        handleBox!.x + handleBox!.width / 2,
        handleBox!.y + handleBox!.height / 2
      )
      await page.mouse.down()
      await page.mouse.move(
        handleBox!.x + handleBox!.width / 2,
        handleBox!.y + handleBox!.height / 2 + 40,
        { steps: 5 }
      )
      await page.mouse.up()
      await expect
        .poll(async () => (await query.boundingBox())!.height)
        .toBeGreaterThan(before!.height + 20)
      await page.getByRole("button", { name: "Keys", exact: true }).click()
      await expect(query).not.toBeAttached()
      await expect(results).toHaveAttribute("data-panel-id", resultId!)
    }
    expect(warnings).toEqual([])
  })

  test("edit-index dialog fits a short landscape phone viewport", async ({ page }) => {
    await page.setViewportSize({ width: 844, height: 390 })
    await page.getByRole("button", { name: "Search", exact: true }).tap()
    await expect(page.getByRole("button", { name: "customer:000 1.00", exact: true })).toBeVisible()
    await page.getByRole("button", { name: "Index actions", exact: true }).tap()
    // Safari can deliver focus to the trigger after opening on touch pointerdown.
    await page.getByRole("button", { name: "Index actions", exact: true }).focus()
    await expect(page.getByRole("menu")).toBeVisible()
    await page.keyboard.press("Escape")
    await expect(page.getByRole("menu")).not.toBeVisible()
    await page.getByRole("button", { name: "Index actions", exact: true }).tap()
    await expect(page.getByRole("menu")).toBeVisible()
    await page.getByRole("button", { name: "Search", exact: true }).tap()
    await expect(page.getByRole("menu")).not.toBeVisible()
    await page.getByRole("button", { name: "Index actions", exact: true }).tap()
    await page.getByRole("menuitem", { name: "Edit Index...", exact: true }).tap()
    const dialog = page.getByRole("dialog", { name: "Edit Index", exact: true })
    await expect(dialog).toBeVisible()
    // Wait for the opening animation before measuring the actual bounds.
    await expect.poll(async () => (await dialog.boundingBox())!.y).toBeGreaterThanOrEqual(15)
    const box = await dialog.boundingBox()
    expect(box!.y + box!.height).toBeLessThanOrEqual(375)
    expect(box!.x).toBeGreaterThanOrEqual(0)
    expect(box!.x + box!.width).toBeLessThanOrEqual(844)
    await dialog.getByRole("button", { name: "Close", exact: true }).tap()
    await expect(dialog).not.toBeVisible()
  })
})
