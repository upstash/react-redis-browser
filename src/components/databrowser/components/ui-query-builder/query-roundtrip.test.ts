import { describe, expect, test } from "bun:test"

import { parseJSObjectLiteral } from "@/lib/utils"

import { parseBuilderQuery, parseQueryString } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import type { QueryNode } from "./types"

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

  // do not flatten $or next to other keys, the server would treat it as an optional boost
  { $and: [{ name: "foo" }, { $or: { age: 18 }, $boost: 2 }] },
  { $and: [{ name: "foo" }, { $or: { age: 18 }, $boost: 2 }], $boost: 3 },
  { $and: [{ name: "foo" }, { $or: { age: 18, title: "bar" } }] },
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
  // The following tests all have a $boost 2 placed on the $or that contains age: 18

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

  // only negated children: [{}] matches all documents for $mustNot to exclude from
  [
    { $and: {}, $mustNot: { name: "foo" } },
    { $and: [{}], $mustNot: { name: "foo" } },
  ],
  { $and: [{}], $mustNot: { name: "foo" } },
  // next to $or the server ANDs $mustNot, so it is read (and written back) as an AND
  [
    { $or: [{}], $mustNot: { name: "foo" } },
    { $and: [{}], $mustNot: { name: "foo" } },
  ],
  [
    { $or: { name: "foo" }, $mustNot: { age: 18 } },
    { $and: [{ $or: { name: "foo" } }], $mustNot: { age: 18 } },
  ],
  [
    { $or: [{ name: "foo" }, { title: "bar" }], $mustNot: { age: 18 }, $boost: 2 },
    { $and: [{ $or: { name: "foo", title: "bar" } }], $mustNot: { age: 18 }, $boost: 2 },
  ],
  // negated children of an OR are alternatives inside the $or array
  { $or: [{ name: "foo" }, { $mustNot: { age: 18 } }] },
  { $or: [{ $mustNot: { name: "foo" } }, { $mustNot: { age: 18 } }] },
  { $or: [{ $mustNot: { name: "foo" } }], $boost: 2 },
  [
    { $or: { name: "foo", $mustNot: { age: 18 } } },
    { $or: [{ name: "foo" }, { $mustNot: { age: 18 } }] },
  ],
  // in an OR object, all exclusions together are one alternative
  [
    { $or: { name: "foo", $mustNot: [{ age: 18 }, { title: "bar" }] } },
    { $or: [{ name: "foo" }, { $and: [{}], $mustNot: [{ age: 18 }, { title: "bar" }] }] },
  ],
  [
    { $and: { name: "foo", $mustNot: { age: 18 } } },
    { $and: { name: "foo" }, $mustNot: { age: 18 } },
  ],
  // each key of a $mustNot object is excluded on its own
  [{ $mustNot: { name: "foo", age: 18 } }, { $mustNot: [{ name: "foo" }, { age: 18 }] }],
  [
    { name: "foo", $mustNot: { age: 18, title: "bar" } },
    { $and: { name: "foo" }, $mustNot: [{ age: 18 }, { title: "bar" }] },
  ],
  // a double negation keeps both negations
  [
    { $mustNot: [{ $mustNot: { name: "foo" } }] },
    { $mustNot: [{ $and: [{}], $mustNot: { name: "foo" } }] },
  ],
  // fields, $and and $mustNot siblings: each $mustNot item is excluded once
  [
    { name: "foo", $and: [{ age: 18 }, { title: "bar" }], $mustNot: { status: "x" } },
    { $and: [{ name: "foo" }, { age: 18, title: "bar" }], $mustNot: { status: "x" } },
  ],
  // must not flattened
  [
    { $and: [{}], $mustNot: [{ name: "foo" }] },
    { $and: [{}], $mustNot: { name: "foo" } },
  ],
  { $or: [{ name: "foo" }, { $and: [{}], $mustNot: { age: 18 } }] },
  // both flattened
  [
    { $and: [{ name: "foo" }], $mustNot: [{ age: 18 }] },
    { $and: { name: "foo" }, $mustNot: { age: 18 } },
  ],

  // nested groups (root AND can't flatten next to $or, inner $or merges to object form)
  [
    { $and: [{ $or: [{ name: "a" }, { status: "b" }] }, { active: true }] },
    { $and: [{ $or: { name: "a", status: "b" } }, { active: true }] },
  ],
  [
    { $and: [{ $or: [{ name: "a" }, { status: { $eq: "b" } }] }, { active: true }] },
    { $and: [{ $or: { name: "a", status: { $eq: "b" } } }, { active: true }] },
  ],
  // nested $or inside $or is not merged into a plain object (which would mean AND)
  { $or: [{ $or: { name: "a", status: "b" } }, { active: true }] },
  // nested $and inside $and is merged
  [
    { $and: [{ $and: { name: "a", status: "b" } }, { $or: { active: true, age: 1 } }] },
    { $and: [{ name: "a", status: "b" }, { $or: { active: true, age: 1 } }] },
  ],

  // boost 0 is kept, boost 1 is the default
  { name: { $smart: "foo", $boost: 0 } },
  { age: { $eq: 18, $boost: 0 } },
  [{ name: { $smart: "foo", $boost: 1 } }, { name: "foo" }],
  { $or: { name: "a", status: "b", $boost: 0 } },
]

describe("query roundtrip: parse → stringify", () => {
  for (const entry of queries) {
    const [input, expected] = Array.isArray(entry) ? entry : [entry, entry]
    test(JSON.stringify(input), () => {
      const result = roundtrip(input)
      expect(result).not.toBeUndefined()
      expect(result).toEqual(expected)
      // What the builder writes can always be opened in the builder again
      expect(parseBuilderQuery(JSON.stringify(expected)).success).toBe(true)
    })
  }
})

const cond = (field: string, value: string | number, not?: boolean): QueryNode => ({
  id: field,
  type: "condition",
  not,
  condition: { field, operator: "eq", value },
})
const group = (groupOperator: "and" | "or", children: QueryNode[], boost?: number): QueryNode => ({
  id: groupOperator,
  type: "group",
  groupOperator,
  children,
  boost,
})

// Builder states that the parser never produces from the expected output directly
const builderStates: [QueryNode, Record<string, unknown>][] = [
  [
    group("and", [group("and", [cond("a", "1"), cond("b", "2")]), group("or", [cond("c", "3")])]),
    { $and: [{ a: { $eq: "1" }, b: { $eq: "2" } }, { $or: { c: { $eq: "3" } } }] },
  ],
  [
    group("or", [cond("a", "1"), group("and", [cond("b", "2", true)])]),
    { $or: [{ a: { $eq: "1" } }, { $and: [{}], $mustNot: { b: { $eq: "2" } } }] },
  ],
  [
    group("or", [cond("a", "1"), cond("b", "2", true)], 0),
    { $or: [{ a: { $eq: "1" } }, { $mustNot: { b: { $eq: "2" } } }], $boost: 0 },
  ],
  [
    group("and", [cond("a", "1"), group("or", [cond("b", "2"), cond("c", "3")], 0)]),
    { $and: [{ a: { $eq: "1" } }, { $or: { b: { $eq: "2" }, c: { $eq: "3" } }, $boost: 0 }] },
  ],

  // Empty groups add no constraint and are dropped
  [group("or", [cond("a", "1"), group("and", [])]), { $or: { a: { $eq: "1" } } }],
  [group("and", [group("or", []), group("and", [group("or", [])])]), {}],
  [
    group("or", [cond("a", "1", true), group("and", []), { ...group("or", []), not: true }]),
    { $or: [{ $mustNot: { a: { $eq: "1" } } }] },
  ],

  // Negated children of an OR are alternatives inside the $or array, not a sibling $mustNot
  // (which the server ANDs with the $or)
  [
    group("or", [cond("a", "1", true), cond("b", "2", true)]),
    { $or: [{ $mustNot: { a: { $eq: "1" } } }, { $mustNot: { b: { $eq: "2" } } }] },
  ],
  [
    group("or", [cond("a", "1"), cond("b", "2", true), cond("c", "3")]),
    { $or: [{ a: { $eq: "1" } }, { $mustNot: { b: { $eq: "2" } } }, { c: { $eq: "3" } }] },
  ],
  [
    group("or", [cond("a", "1"), { ...group("and", [cond("b", "2"), cond("c", "3")]), not: true }]),
    {
      $or: [{ a: { $eq: "1" } }, { $mustNot: { $and: { b: { $eq: "2" }, c: { $eq: "3" } } } }],
    },
  ],
  [group("or", [cond("a", "1", true)], 2), { $or: [{ $mustNot: { a: { $eq: "1" } } }], $boost: 2 }],
  [
    { ...group("or", [cond("a", "1"), cond("b", "2", true)]), not: true },
    { $mustNot: [{ $or: [{ a: { $eq: "1" } }, { $mustNot: { b: { $eq: "2" } } }] }] },
  ],

  // Negated groups with more than one key stay array items, since the server excludes
  // each key of a $mustNot object separately
  [
    group("and", [cond("a", "1"), { ...group("and", [cond("b", "2", true)]), not: true }]),
    {
      $and: { a: { $eq: "1" } },
      $mustNot: [{ $and: [{}], $mustNot: { b: { $eq: "2" } } }],
    },
  ],
  [
    group("and", [
      cond("a", "1"),
      { ...group("and", [cond("b", "2"), cond("c", "3", true)]), not: true },
    ]),
    {
      $and: { a: { $eq: "1" } },
      $mustNot: [{ $and: { b: { $eq: "2" } }, $mustNot: { c: { $eq: "3" } } }],
    },
  ],
  // A child group's $mustNot is not flattened into the root
  [
    group("and", [cond("a", "1"), group("and", [cond("b", "2", true)])]),
    { $and: [{ a: { $eq: "1" } }, { $and: [{}], $mustNot: { b: { $eq: "2" } } }] },
  ],
]

describe("builder → stringify → parse → stringify is stable", () => {
  for (const [root, expected] of builderStates) {
    test(JSON.stringify(expected), () => {
      const str = stringifyQueryState({ root })
      expect(parseJSObjectLiteral<Record<string, unknown>>(str)).toEqual(expected)
      const parsed = parseBuilderQuery(str)
      expect(parsed.success).toBe(true)
      if (parsed.success) expect(stringifyQueryState(parsed.state)).toEqual(str)
    })
  }
})

describe("parseBuilderQuery refuses $or/$should that only boosts the score", () => {
  // Next to a required key in a query object, the server only uses $or/$should for scoring
  const refused = [
    { name: "foo", $should: { age: 18 } },
    { name: "foo", $or: { age: 18 } },
    { $and: [{ name: "foo" }], $or: [{ age: 18 }] },
    { $must: { name: "foo" }, $or: { age: 18 } },
    { $or: [{ name: "foo", $or: { age: 18 } }, { title: "bar" }] },
    { $mustNot: [{ name: "foo", $should: { age: 18 } }] },
    { $and: { title: "bar", $or: [{ name: "foo", $should: { age: 18 } }] } },
  ]
  for (const query of refused) {
    test(JSON.stringify(query), () => {
      expect(parseBuilderQuery(JSON.stringify(query)).success).toBe(false)
    })
  }

  // $or next to only $mustNot or a numeric $boost filters, and so does every key of an
  // $and/$or object
  const accepted = [
    { $or: { age: 18 }, $mustNot: { name: "foo" } },
    { $or: { age: 18, name: "foo" }, $boost: 2 },
    { $and: { name: "foo", $or: { age: 18, title: "bar" } } },
    { $or: { name: "foo", $and: { age: 18, title: "bar" } } },
  ]
  for (const query of accepted) {
    test(JSON.stringify(query), () => {
      expect(parseBuilderQuery(JSON.stringify(query)).success).toBe(true)
    })
  }
})
