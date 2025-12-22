import { expect, test, type Page } from "@playwright/test"

import { setup } from "./utils"

/**
 * Helper to set localStorage before page loads
 */
const setStorageBeforeLoad = async (page: Page, data: object) => {
  await page.addInitScript((storageData) => {
    localStorage.setItem("redis-browser-data", JSON.stringify(storageData))
  }, data)
}

const getTabs = (page: Page) => page.locator('[id^="tab-"]:not([id^="tab-type"])')

/**
 * Version 1 data structure:
 * - tabs are [id, data] where data might not have `id` field
 */
const createVersion1Data = () => ({
  state: {
    selectedTab: "tab-1",
    tabs: [
      [
        "tab-1",
        {
          // Note: no `id` field - this is what v1 migration adds
          selectedKey: "mykey-1",
          search: { key: "", type: undefined },
        },
      ],
      [
        "tab-2",
        {
          selectedKey: "mykey-2",
          search: { key: "mykey", type: undefined },
        },
      ],
    ],
    searchHistory: [],
  },
  version: 1,
})

/**
 * Version 2 data structure:
 * - tabs have `id` field
 * - tabs have `selectedKey` (singular) instead of `selectedKeys` (array)
 */
const createVersion2Data = () => ({
  state: {
    selectedTab: "tab-1",
    tabs: [
      [
        "tab-1",
        {
          id: "tab-1",
          selectedKey: "mykey-1", // singular - will be migrated to selectedKeys array
          search: { key: "", type: undefined },
        },
      ],
      [
        "tab-2",
        {
          id: "tab-2",
          selectedKey: "mykey-2",
          search: { key: "search-term", type: undefined },
        },
      ],
    ],
    searchHistory: ["previous-search"],
  },

  version: 2,
})

const testFunctionality = () => {
  test("add new tab", async ({ page }) => {
    await page.getByRole("button", { name: "Add new tab" }).click()
    await expect(getTabs(page)).toHaveCount(3)
  })

  test("select new key", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-33")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "mykey-33", exact: true }).click()
    await expect(page.getByRole("textbox", { name: "editor" })).toHaveValue("value-33")
  })
}

test.describe("migrate from v1", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
    await setStorageBeforeLoad(page, createVersion1Data())
    await page.goto("/")
  })

  testFunctionality()
})

test.describe("migrate from v2", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
    await setStorageBeforeLoad(page, createVersion2Data())
    await page.goto("/")
  })

  testFunctionality()
})

test.describe("migrate from v2 that has version set to 3 (broken)", () => {
  test.beforeEach(async ({ page }) => {
    await setup(page)
    const state = createVersion2Data()
    state.version = 3
    await setStorageBeforeLoad(page, state)
    await page.goto("/")
  })

  testFunctionality()
})
