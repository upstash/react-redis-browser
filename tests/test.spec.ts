import { describe } from "node:test"
import { expect, test } from "@playwright/test"

import { markDatabaseAsModified, setup } from "./utils"

test.beforeEach(async ({ page }) => {
  await setup(page)

  await page.goto("/")
})

describe("keys", () => {
  test("can search for a key", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-2")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "mykey-24" }).click()

    await expect(page.getByText("value-1", { exact: true })).not.toBeVisible()
    await expect(
      page.getByRole("textbox", {
        name: "editor",
      })
    ).toHaveValue("value-24")
    await expect(page.getByText("Length:8")).toBeVisible()
    await expect(page.getByText("TTL:Forever")).toBeVisible()
  })

  test("can filter keys by type", async ({ page }) => {
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "List" }).click()
    await page.getByRole("button", { name: "mylist" }).click()

    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "JSON" }).click()
    await page.getByRole("button", { name: "myjson" }).click()

    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "String" }).click()

    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-13")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")

    await page.getByRole("button", { name: "mykey-" }).click()
  })

  test("can cancel out of deleting a key", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-13")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")

    await page.getByRole("button", { name: "mykey-13" }).click()

    await page.getByRole("button").filter({ hasText: /^$/ }).nth(3).click()
    await page.getByRole("menuitem", { name: "Delete key" }).click()

    await page.getByRole("button", { name: "Cancel" }).press("Escape")

    await page.getByRole("menuitem", { name: "Delete key" }).click()
    await page.getByRole("button", { name: "Cancel" }).press("Escape")
    await page.getByRole("button", { name: "Clear" }).click()
  })

  test("can delete a key", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-13")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")

    await page.getByRole("button", { name: "mykey-13" }).click()

    await page.getByRole("button").filter({ hasText: /^$/ }).nth(3).click()
    await page.getByRole("menuitem", { name: "Delete key" }).click()

    await page.getByRole("button", { name: "Yes, Delete" }).click()

    await markDatabaseAsModified()

    await expect(page.getByRole("button", { name: "mykey-13" })).not.toBeVisible()
  })

  test("can add a string key", async ({ page }) => {
    await page.getByRole("main").click()
    await page
      .getByRole("button", {
        name: "Add key",
      })
      .click()
    await page.getByRole("textbox", { name: "mykey" }).click()
    await page.getByRole("textbox", { name: "mykey" }).fill("----added-key")
    await page.getByRole("button", { name: "Create" }).click()

    await markDatabaseAsModified()

    await expect(
      page.getByRole("textbox", {
        name: "editor",
      })
    )
      // Default value for newly created key
      .toHaveValue("value")
  })

  test("can add a json key", async ({ page }) => {
    await page
      .getByRole("button", {
        name: "Add key",
      })
      .click()
    await page.getByRole("combobox").click()
    await page.getByRole("option", { name: "JSON" }).click()
    await page.getByRole("textbox", { name: "mykey" }).click()
    await page.getByRole("textbox", { name: "mykey" }).fill("----added-json-key")
    await page.getByRole("button", { name: "Create" }).click()

    await markDatabaseAsModified()

    await expect(
      page.getByRole("textbox", {
        name: "editor",
      })
    )
      // Default value for newly created key
      .toHaveValue(/"foo": "bar"/)
  })
})

describe("hash", () => {
  test("can read a hash value and cancel", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("myhash")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "myhash" }).click()

    await page.getByRole("cell", { name: "field-10" }).click()

    // check cancel and save buttons are there
    await expect(page.getByRole("button", { name: "Cancel" })).toBeVisible()
    await expect(page.getByRole("button", { name: "Save" })).toBeVisible()

    // click cancel
    await page.getByRole("button", { name: "Cancel" }).click()

    // check that the value is still the same
    await expect(page.getByText("field-10")).toBeVisible()
  })

  test("can edit a hash value and save", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("myhash")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "myhash" }).click()

    await page.getByRole("cell", { name: "field-10" }).click()

    await expect(
      page
        .getByRole("textbox", {
          name: "editor",
        })
        .nth(1)
    ).toHaveValue("value-10")
    await page
      .getByRole("textbox", {
        name: "editor",
      })
      .nth(1)
      .fill("value-10-modified")

    await page.getByRole("button", { name: "Save" }).click()

    await expect(page.getByRole("button", { name: "Save" })).not.toBeVisible()
    await expect(page.getByRole("button", { name: "Cancel" })).not.toBeVisible()

    await markDatabaseAsModified()

    await expect(page.getByText("field-10", { exact: true })).toBeVisible()
    await expect(page.getByText("value-10-modified", { exact: true })).toBeVisible()
  })

  test("can delete a hash value", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("myhash")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "myhash" }).click()

    await page.getByRole("row", { name: "field-10 value-10" }).getByRole("button").click()
    await page.getByRole("button", { name: "Yes, Delete" }).click()

    await markDatabaseAsModified()

    await expect(page.getByRole("row", { name: "field-10 value-10" })).not.toBeVisible()
  })
})

describe("tabs", () => {
  test("can switch tabs", async ({ page }) => {
    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-42")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "mykey-42" }).click()

    await page.getByRole("button", { name: "Add new tab" }).click()

    await page.getByRole("textbox", { name: "Search" }).click()
    await page.getByRole("textbox", { name: "Search" }).fill("mykey-13")
    await page.getByRole("textbox", { name: "Search" }).press("Enter")
    await page.getByRole("button", { name: "mykey-13" }).click()

    // Changes to the first tab
    await page.getByText("mykey-42*").click()

    // Should have the value
    await expect(
      page.getByRole("textbox", {
        name: "editor",
      })
    ).toHaveValue("value-42")

    // Changes to the second tab
    await page.getByText("mykey-13*", { exact: true }).click()

    // Should have the value
    await expect(
      page.getByRole("textbox", {
        name: "editor",
      })
    ).toHaveValue("value-13")
  })
})
