import { describe, expect, test } from "bun:test"

import { parseSearchQuery } from "@/lib/utils"

import { getQueryMeaning } from "./query-meaning"

const meaning = (query: string) => getQueryMeaning(parseSearchQuery(query))

describe("getQueryMeaning", () => {
  const same: [string, string][] = [
    [`{ a: "x" }`, `{ a: { $smart: "x" } }`],
    [`{ a: 1 }`, `{ a: { $eq: 1 } }`],
    [`{ a: "x", b: "y" }`, `{ b: "y", a: "x" }`],
    [`{ $and: { a: "x", b: "x" } }`, `{ a: "x", b: "x" }`],
    [`{ $and: [{ a: "x" }, { b: "x" }] }`, `{ a: "x", b: "x" }`],
    [`{ $must: { a: "x" } }`, `{ $and: { a: "x" } }`],
    [`{ $or: { a: 1 }, $boost: 2 }`, `{ $or: { a: 1, $boost: 2 } }`],
    [`{ $and: { a: "x", $boost: 2 } }`, `{ a: "x", $boost: 2 }`],
    [
      `{ $and: { a: "x", $or: { b: "x", c: "x" } } }`,
      `{ $and: [{ a: "x" }, { $or: { b: "x", c: "x" } }] }`,
    ],
    [`{ $mustNot: { $and: { a: 1 } } }`, `{ $mustNot: { a: 1 } }`],
    [`{ a: { $gte: 1, $lte: 2 } }`, `{ a: { $lte: 2, $gte: 1 } }`],
    [``, `{}`],
    // Without a must clause the lone $or still has to match
    [`{ $or: { a: 1 }, $mustNot: { b: 1 } }`, `{ $and: [{ $or: { a: 1 } }], $mustNot: { b: 1 } }`],
  ]
  for (const [a, b] of same) {
    test(`${a} runs the same search as ${b}`, () => {
      expect(meaning(a)).toBeDefined()
      expect(meaning(a)).toBe(meaning(b))
    })
  }

  const different: [string, string][] = [
    // Next to other keys a root $or only adds to the score, in an $and body it is required
    [`{ a: "x", $or: { b: "x", c: "x" } }`, `{ $and: { a: "x", $or: { b: "x", c: "x" } } }`],
    // An $or object body matches any of its fields
    [`{ $or: { a: "x", b: "x" } }`, `{ a: "x", b: "x" }`],
    [`{ $or: { $and: { a: "x", b: "x" } } }`, `{ $or: { a: "x", b: "x" } }`],
    // A $mustNot object excludes each key, a list item excludes the whole item
    [`{ $mustNot: { a: 1, b: 1 } }`, `{ $mustNot: [{ a: 1, b: 1 }] }`],
    // A boosted $mustNot object excludes the union of its keys
    [`{ $mustNot: { a: 1, b: 1, $boost: 2 } }`, `{ $mustNot: { a: 1, b: 1 } }`],
    // [{}] matches everything
    [`{ $or: [{ a: "x" }, { $and: [{}] }] }`, `{ $or: { a: "x" } }`],
    [`{ a: { $gte: 1, $lte: 2 } }`, `{ a: { $gte: 1 } }`],
    [`{ a: { $smart: 1 } }`, `{ a: 1 }`],
    [`{ a: { $eq: 1, $boost: 1 } }`, `{ a: 1 }`],
    [`{ a: "x", $boost: 2 }`, `{ a: "x" }`],
    [`{ $and: { a: "x", $boost: 3 }, $boost: 2 }`, `{ a: "x", $boost: 3 }`],
    // Next to a must clause the $or is optional
    [`{ a: 1, $or: { b: 1 } }`, `{ a: 1, $and: { b: 1 } }`],
  ]
  for (const [a, b] of different) {
    test(`${a} differs from ${b}`, () => {
      expect(meaning(a)).toBeDefined()
      expect(meaning(b)).toBeDefined()
      expect(meaning(a)).not.toBe(meaning(b))
    })
  }

  // Rejected by the server
  const invalid = [
    `{ $boost: 2 }`,
    `{ a: { $boost: 2 } }`,
    `{ $and: {} }`,
    `{ $or: [] }`,
    `{ $and: { a: 1 }, $or: { b: 1 } }`,
    `{ $unknown: 1 }`,
  ]
  for (const query of invalid) {
    test(`${query} is invalid`, () => {
      expect(meaning(query)).toBeUndefined()
    })
  }
})
