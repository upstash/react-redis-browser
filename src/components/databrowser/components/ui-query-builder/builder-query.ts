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

/** Which editor wrote a stored query */
export type QueryWrittenBy = "ui" | "code"

export const UNSUPPORTED_QUERY_MESSAGE =
  "This query can't be shown in the Query Builder without changing it. Keep editing it in the Code Editor."

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const GROUP_KEYS = new Set(["$and", "$or", "$must", "$should"])

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item))
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])])
  )
}

/**
 * Canonical form of a query node (the root, a list item, or an $and/$or body), so the
 * shorthand the builder writes compares equal to the long form. This is the only rewrite:
 * the server parses { f: "x" } like { f: { $smart: "x" } } and { f: 1 } like { f: { $eq: 1 } }.
 * Everything else, including key names, must match exactly.
 */
export const canonicalQuery = (node: unknown): unknown => {
  if (!isPlainObject(node)) return node

  const result: Record<string, unknown> = {}
  for (const [key, value] of Object.entries(node)) {
    if (GROUP_KEYS.has(key) || (key === "$mustNot" && Array.isArray(value))) {
      result[key] = Array.isArray(value)
        ? value.map((item) => canonicalQuery(item))
        : canonicalQuery(value)
    } else if (key.startsWith("$")) {
      // Includes a $mustNot object, whose keys the server excludes one by one
      result[key] = value
    } else if (typeof value === "string") {
      result[key] = { $smart: value }
    } else if (typeof value === "number" || typeof value === "boolean") {
      result[key] = { $eq: value }
    } else {
      result[key] = value
    }
  }
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
