import { describe, expect, test } from "bun:test"

import { parseJSObjectLiteral } from "@/lib/utils"

import { parseQueryString } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"

const roundtrip = (input: Record<string, unknown>) => {
  const state = parseQueryString(JSON.stringify(input))
  if (!state) return
  return parseJSObjectLiteral(stringifyQueryState(state))
}

// Single object = input and expected are the same
// Tuple [input, expected] = when output differs from input due to normalization
const queries: (Record<string, unknown> | [Record<string, unknown>, Record<string, unknown>])[] = [
  // empty
  {},

  // shorthand ($smart for strings, $eq for number/boolean)
  { name: "foo" },
  { name: "foo", title: "bar" },
  { age: 25 },
  { active: true },

  // explicit $smart collapses to shorthand
  [{ name: { $smart: "foo" } }, { name: "foo" }],
  // explicit $smart on boolean/number auto-fixes to $eq then collapses
  [{ active: { $smart: true } }, { active: true }],
  [{ age: { $smart: 25 } }, { age: 25 }],

  // $eq on string stays as $eq, $eq on number/boolean collapses
  { name: { $eq: "foo" } },
  [{ age: { $eq: 25 } }, { age: 25 }],

  // $ne
  { name: { $ne: "foo" } },
  { age: { $ne: 0 } },

  // numeric comparisons
  { age: { $gt: 18 } },
  { age: { $gte: 18 } },
  { age: { $lt: 100 } },
  { age: { $lte: 100 } },

  // $in
  { status: { $in: ["active", "pending"] } },

  // $phrase
  { bio: { $phrase: "hello world" } },
  { bio: { $phrase: { value: "hello world", slop: 2 } } },
  { bio: { $phrase: { value: "hello", prefix: true } } },

  // $regex
  { name: { $regex: "^foo.*bar$" } },

  // $fuzzy
  { name: { $fuzzy: { value: "foo", distance: 2 } } },

  // root AND removed
  [{ $and: { age: 18 } }, { age: 18 }],
  // root OR stays
  [{ $or: { age: 18 } }, { $or: { age: 18 } }],

  // root and removed and flattened
  [{ $and: [{ name: "foo" }, { age: 18 }] }, { name: "foo", age: 18 }],
  // root or stays and flattened
  [{ $or: [{ status: "active" }, { age: 18 }] }, { $or: { status: "active", age: 18 } }],

  // --- flattening with $boost ---

  // root $and removed with $boost
  [{ $and: { name: "foo", $boost: 2 } }, { name: "foo", $boost: 2 }],
  // root $or stays and flattened with $boost
  [{ $or: { name: "foo", $boost: 2 } }, { $or: { name: "foo", $boost: 2 } }],

  // do not flatten
  { name: "foo", $or: { age: 18, $boost: 2 } },
  { name: "foo", $or: { age: 18, $boost: 2 }, $boost: 3 },
  { name: "foo", $and: { age: 18, $boost: 2 }, $boost: 3 },

  // flatten the $boost
  [
    {
      $or: [
        {
          name: "foo",
          $boost: 2,
        },
        {
          age: 18,
          $boost: 3,
        },
      ],
    },
    {
      $or: {
        name: { $smart: "foo", $boost: 2 },
        age: { $eq: 18, $boost: 3 },
      },
    },
  ],

  // flatten with $boost and remove the root $and
  [
    {
      $and: [
        {
          name: "foo",
          $boost: 2,
        },
        {
          age: 18,
          $boost: 3,
        },
      ],
    },
    {
      name: { $smart: "foo", $boost: 2 },
      age: { $eq: 18, $boost: 3 },
    },
  ],

  // flatten carefully when single child with $boost
  [
    {
      $and: [
        {
          name: "foo",
          age: 18,
          $boost: 2,
        },
      ],
    },
    {
      $and: {
        name: "foo",
        age: 18,
        $boost: 2,
      },
    },
  ],

  // don't flatten when one child is combined with $boost
  {
    $and: [
      {
        name: "foo",
        age: 18,
        $boost: 2,
      },
      {
        status: "active",
      },
    ],
  },

  // --- $boost placement ---
  // flat & flat
  [
    {
      $or: {
        $or: {
          age: 18,
          $boost: 2,
        },
        foo: "bar",
      },
    },
    {
      $or: [
        {
          $or: { age: 18 },
          $boost: 2,
        },
        { foo: "bar" },
      ],
    },
  ],

  // array & flat (the best way, should stay as is)
  {
    $or: [
      {
        $or: {
          age: 18,
        },
        // place on the same level as the group operator,
        // whenever you can
        $boost: 2,
      },
    ],
  },

  // array & array (here we can't flatten the $or, so it stays as is)
  {
    $or: [
      {
        $or: [{ age: 18 }, { age: 19 }],
        // again, same level if you can
        $boost: 2,
      },
      { foo: "bar" },
    ],
  },

  // --- $mustNot ---

  // $and stays with mustNot
  { $and: {}, $mustNot: { name: "foo" } },
  { $or: {}, $mustNot: { name: "foo" } },
  // must not flattened
  [
    { $and: {}, $mustNot: [{ name: "foo" }] },
    { $and: {}, $mustNot: { name: "foo" } },
  ],
  // both flattened
  [
    { $and: [{ name: "foo" }], $mustNot: [{ age: 18 }] },
    { $and: { name: "foo" }, $mustNot: { age: 18 } },
  ],

  // nested groups (root AND flattens, inner $or merges to object form)
  [
    { $and: [{ $or: [{ name: "a" }, { status: "b" }] }, { active: true }] },
    { $or: { name: "a", status: "b" }, active: true },
  ],
  [
    { $and: [{ $or: [{ name: "a" }, { status: { $eq: "b" } }] }, { active: true }] },
    { $or: { name: "a", status: { $eq: "b" } }, active: true },
  ],
]

describe("query roundtrip: parse → stringify", () => {
  for (const entry of queries) {
    const [input, expected] = Array.isArray(entry) ? entry : [entry, entry]
    test(JSON.stringify(input), () => {
      const result = roundtrip(input)
      expect(result).not.toBeUndefined()
      expect(result).toEqual(expected)
    })
  }
})
