/**
 * Decides when a stored query string can be shown in the UI query builder.
 *
 * The builder tree is what the user sees, and stringify(tree) is what gets searched.
 * These two must never diverge, and a query typed in the code editor must never be
 * rewritten with a different meaning.
 */

import { INVALID_QUERY_MESSAGE, parseJSObjectLiteral, parseSearchQuery } from "@/lib/utils"

import { createInitialQueryState, parseQueryString } from "./query-parser"
import { stringifyQueryState } from "./query-stringify"
import type { QueryState } from "./types"

/** Which editor wrote a stored query, undefined for queries stored before this was tracked */
export type QueryWrittenBy = "ui" | "code" | undefined

export const UNSUPPORTED_QUERY_MESSAGE =
  "This query can't be shown in the Query Builder without changing it. Keep editing it in the Code Editor."

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const ALIASES: Record<string, string> = { $must: "$and", $should: "$or" }
const GROUP_KEYS = new Set(["$and", "$or", "$must", "$should", "$mustNot"])

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item))
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])])
  )
}

/** Canonical form of a field value. Each rewrite here matches the server exactly. */
const canonicalField = (value: unknown): unknown => {
  // Shorthand: strings are $smart, numbers and booleans are $eq
  if (typeof value === "string") return { $smart: value }
  if (typeof value === "number" || typeof value === "boolean") return { $eq: value }
  if (!isPlainObject(value)) return value

  const result: Record<string, unknown> = {}
  for (const [op, opValue] of Object.entries(value)) {
    // $smart and $eq only differ for text
    if (op === "$smart" && (typeof opValue === "number" || typeof opValue === "boolean")) {
      result.$eq = opValue
    } else if (op === "$boost" && opValue === 1) {
      // A boost of 1 doesn't change the score
    } else if (op === "$fuzzy" && isPlainObject(opValue) && !("distance" in opValue)) {
      // The default distance is 1
      result.$fuzzy = { ...opValue, distance: 1 }
    } else if (
      op === "$phrase" &&
      isPlainObject(opValue) &&
      Object.keys(opValue).length === 1 &&
      "value" in opValue
    ) {
      result.$phrase = opValue.value
    } else {
      result[op] = opValue
    }
  }
  return result
}

/** Canonical form of a query object, so equivalent spellings compare equal */
export const canonicalQuery = (query: unknown): unknown => {
  if (Array.isArray(query)) return query.map((item) => canonicalQuery(item))
  if (!isPlainObject(query)) return query

  // $must/$should mean the same as $and/$or when used alone. Next to each other the server
  // treats them differently (e.g. $must with $or is allowed, $and with $or is an error).
  const groupCount = ["$and", "$or", "$must", "$should"].filter((key) => key in query).length

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(query)) {
    const name = groupCount === 1 ? (ALIASES[key] ?? key) : key

    if (GROUP_KEYS.has(key)) {
      result[name] = canonicalQuery(value)
    } else if (key === "$boost") {
      if (value !== 1) result.$boost = value
    } else if (key.startsWith("$")) {
      result[key] = value
    } else {
      result[key] = canonicalField(value)
    }
  }

  // { $and: { ... } } alone is its body: nested clauses of an $and body are required, like
  // the top-level ones. Not with $or inside, which is only optional at the top level.
  const body = result.$and
  if (Object.keys(result).length === 1 && isPlainObject(body) && !("$or" in body)) return body

  return result
}

const isSameQuery = (a: unknown, b: unknown) =>
  JSON.stringify(sortKeys(canonicalQuery(a))) === JSON.stringify(sortKeys(canonicalQuery(b)))

/**
 * Returns why a query typed in the code editor can't be opened in the builder, or undefined.
 * The builder accepts it only if writing its tree back gives the same query, so opening it
 * never changes what is searched.
 */
export const getQueryBuilderError = (queryString: string): string | undefined => {
  const query = parseSearchQuery(queryString)
  if (!query) return INVALID_QUERY_MESSAGE

  const state = parseQueryString(queryString) ?? createInitialQueryState()
  const written = parseJSObjectLiteral<unknown>(stringifyQueryState(state))
  return isSameQuery(query, written) ? undefined : UNSUPPORTED_QUERY_MESSAGE
}

export type BuilderQueryResult =
  | {
      success: true
      state: QueryState
      /** The query to store instead, when it differs from what the builder shows */
      rewrite?: string
    }
  | { success: false; error: string }

/**
 * Loads a stored query into the builder (on mount, index switch or any external change).
 *
 * Queries the builder wrote are read as builder trees, also ones older versions wrote in
 * shapes the server reads differently. The tree is then the source of truth: if its string
 * differs, it is written back right away so the results match what the builder shows.
 *
 * Queries typed in the code editor are only opened if that keeps them unchanged.
 */
export const resolveBuilderQuery = (
  queryString: string,
  writtenBy: QueryWrittenBy
): BuilderQueryResult => {
  if (writtenBy === "code") {
    const error = getQueryBuilderError(queryString)
    if (error) return { success: false, error }
    return { success: true, state: parseQueryString(queryString) ?? createInitialQueryState() }
  }

  if (!parseSearchQuery(queryString)) return { success: false, error: INVALID_QUERY_MESSAGE }

  // Valid queries without anything the builder can show (e.g. { $boost: 2 }) are empty trees
  const state = parseQueryString(queryString) ?? createInitialQueryState()
  const written = stringifyQueryState(state)
  const isUnchanged = written === queryString || (!queryString.trim() && written === "{}")
  return { success: true, state, rewrite: isUnchanged ? undefined : written }
}
