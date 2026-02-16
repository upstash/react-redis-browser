import { describe, expect, test } from "bun:test"

import { parseJSObjectLiteral } from "@/lib/utils"

import { parseQueryString } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"

const roundtrip = (input: string) => {
  const state = parseQueryString(input)
  if (!state) return
  return parseJSObjectLiteral(stringifyQueryState(state))
}

const parse = (input: string) => parseJSObjectLiteral(input)

/** Deep equal ignoring key order */
const deepEqual = (a: unknown, b: unknown): boolean => {
  if (a === b) return true
  if (typeof a !== typeof b) return false
  if (Array.isArray(a) && Array.isArray(b)) {
    if (a.length !== b.length) return false
    return a.every((item, i) => deepEqual(item, b[i]))
  }
  if (a && b && typeof a === "object" && typeof b === "object") {
    const keysA = Object.keys(a as Record<string, unknown>).sort()
    const keysB = Object.keys(b as Record<string, unknown>).sort()
    if (keysA.length !== keysB.length) return false
    return keysA.every(
      (key, i) =>
        key === keysB[i] &&
        deepEqual((a as Record<string, unknown>)[key], (b as Record<string, unknown>)[key])
    )
  }
  return false
}

// [input, expected output] — when output differs from input due to normalization
// If only a string is provided, the output should match the input exactly.
const queries: (string | [string, string])[] = [
  // shorthand ($smart)
  `{ name: "foo" }`,
  `{ name: "foo", title: "bar" }`,
  `{ age: 25 }`,
  `{ active: true }`,

  // explicit $smart collapses to shorthand
  [`{ name: { $smart: "foo" } }`, `{ name: "foo" }`],

  // $eq
  `{ name: { $eq: "foo" } }`,
  `{ age: { $eq: 25 } }`,

  // $ne
  `{ name: { $ne: "foo" } }`,
  `{ age: { $ne: 0 } }`,

  // numeric comparisons
  `{ age: { $gt: 18 } }`,
  `{ age: { $gte: 18 } }`,
  `{ age: { $lt: 100 } }`,
  `{ age: { $lte: 100 } }`,

  // $in
  `{ status: { $in: ["active", "pending"] } }`,

  // $phrase
  `{ bio: { $phrase: "hello world" } }`,
  `{ bio: { $phrase: { value: "hello world", slop: 2 } } }`,
  `{ bio: { $phrase: { value: "hello", prefix: true } } }`,

  // $regex
  `{ name: { $regex: "^foo.*bar$" } }`,

  // $fuzzy
  `{ name: { $fuzzy: { value: "foo", distance: 2 } } }`,

  // boolean groups
  `{ $and: [{ name: "foo" }, { age: { $gt: 18 } }] }`,
  `{ $or: [{ status: "active" }, { age: { $gt: 18 } }] }`,

  // $mustNot
  [`{ $mustNot: { name: "foo" } }`, `{ $mustNot: [{ name: "foo" }] }`],
  `{ $and: [{ name: "foo" }], $mustNot: [{ age: { $lt: 18 } }] }`,

  // nested groups ($or with $smart children merges to object form)
  [
    `{ $and: [{ $or: [{ name: "a" }, { status: "b" }] }, { active: true }] }`,
    `{ $and: [{ $or: { name: "a", status: "b" } }, { active: true }] }`,
  ],

  [
    `{ $and: [{ $or: [{ name: "a" }, { status: { $eq: "b" } }] }, { active: true }] }`,
    `{ $and: [{ $or: { name: "a", status: { $eq: "b" } } }, { active: true }] }`,
  ],

  // boost
  `{ name: { $eq: "foo", $boost: 2 } }`,

  // empty
  `{}`,
]

describe("query roundtrip: parse → stringify", () => {
  for (const entry of queries) {
    const [input, expected] = Array.isArray(entry) ? entry : [entry, entry]
    test(input, () => {
      const result = roundtrip(input)
      expect(result).not.toBeUndefined()
      expect(deepEqual(result, parse(expected))).toBe(true)
    })
  }
})
