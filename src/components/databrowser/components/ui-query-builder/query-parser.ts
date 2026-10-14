/**
 * Query Parser
 *
 * Parses query strings into QueryState objects for the UI builder.
 * Also provides factory functions and tree traversal utilities.
 */

import { parseJSObjectLiteral } from "@/lib/utils"

import {
  ALL_OPERATORS,
  generateId,
  type FieldInfo,
  type FieldOperator,
  type GroupOperator,
  type QueryNode,
  type QueryState,
} from "./types"

// ============================================================================
// PARSING: String → QueryState
// ============================================================================

export type ParseResult = { success: true; state: QueryState } | { success: false; error: string }

const MUST_SHOULD_ERROR =
  "Queries using both $must and $should are not supported in the UI query builder. Next to $must, $should only boosts the score."

/**
 * Thrown for queries the UI builder can't represent without changing their meaning,
 * so switching to the builder never silently rewrites the query.
 */
class UnsupportedQueryError extends Error {}

/** Throw for an unsupported query part, with a hint on what to change */
const unsupported = (part: string, hint: string): never => {
  throw new UnsupportedQueryError(`${part} is not supported in the UI query builder. ${hint}`)
}

/**
 * Set while re-parsing a query the previous builder version wrote, see parseQueryStringWithError.
 * Older builders wrote some shapes that the server reads differently from the builder tree,
 * e.g. { field, $or } for "field AND (a OR b)". This mode reads them with the builder's intent.
 */
let legacy = false

const isOperatorKey = (key: string): boolean => key.startsWith("$")

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const parseBoost = (value: unknown): number => {
  if (typeof value !== "number") return unsupported("A non-numeric $boost", "Use a number.")
  return value
}

/**
 * Check if an object contains both $must and $should at the same level,
 * which is not supported in UI query builder.
 * Only catches { $must: ..., $should: ... } pattern, NOT $and/$or combinations.
 */
const hasMustShouldCombinationInObject = (obj: unknown): boolean => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false

  // Only error if BOTH $must AND $should are present at this level
  if ("$must" in obj && "$should" in obj) return true

  return Object.values(obj).some(
    (value) =>
      hasMustShouldCombinationInObject(value) ||
      (Array.isArray(value) && value.some((item) => hasMustShouldCombinationInObject(item)))
  )
}

/**
 * Check if a query string contains both $must and $should,
 * which is not supported in the UI query builder.
 */
export const hasMustShouldCombination = (queryString: string): boolean => {
  if (!queryString || queryString.trim() === "" || queryString.trim() === "{}") {
    return false
  }

  try {
    const obj = parseJSObjectLiteral<Record<string, unknown>>(queryString)
    if (!obj) return false
    return hasMustShouldCombinationInObject(obj)
  } catch {
    return false
  }
}

/**
 * Normalize operator keys: $must → $and, $should → $or
 */
const normalizeOperators = (obj: unknown): unknown => {
  if (!obj || typeof obj !== "object") return obj

  if (Array.isArray(obj)) {
    return obj.map((element) => normalizeOperators(element))
  }

  const record = obj as Record<string, unknown>
  const result: Record<string, unknown> = {}

  for (const [key, value] of Object.entries(record)) {
    let normalizedKey = key
    if (key === "$must") normalizedKey = "$and"
    if (key === "$should") normalizedKey = "$or"

    if (normalizedKey in result) {
      const alias = normalizedKey === "$and" ? "$must" : "$should"
      unsupported(`Using both ${alias} and ${normalizedKey}`, "Merge them into one of the two.")
    }
    result[normalizedKey] = normalizeOperators(value)
  }

  return result
}

/** Parse a single operator of a field condition into a condition node */
const parseOperator = (field: string, op: FieldOperator, opValue: unknown): QueryNode => {
  let operator = op
  let value = opValue
  let fuzzyDistance: 1 | 2 | undefined
  let phraseSlop: number | undefined
  let phrasePrefix: boolean | undefined

  // Handle fuzzy: { $fuzzy: { value: "x", distance: 2 } }
  if (op === "fuzzy" && isPlainObject(value)) {
    const { value: fuzzyValue, distance, ...rest } = value
    if (
      Object.keys(rest).length > 0 ||
      (distance !== undefined && distance !== 1 && distance !== 2)
    ) {
      unsupported("This $fuzzy option", "Only value and distance (1 or 2) can be used.")
    }
    value = fuzzyValue ?? ""
    fuzzyDistance = (distance as 1 | 2 | undefined) ?? 1
  }

  // Handle phrase: { $phrase: "text" } or { $phrase: { value: "text", slop?: n, prefix?: bool } }
  if (op === "phrase" && isPlainObject(value)) {
    const { value: phraseValue, slop, prefix, ...rest } = value
    if (Object.keys(rest).length > 0) {
      unsupported("This $phrase option", "Only value, slop and prefix can be used.")
    }
    value = phraseValue ?? ""
    // The server rejects slop with prefix, slop 0 is the default and can be dropped
    if (typeof slop === "number" && slop > 0 && prefix) {
      unsupported("$phrase with both slop and prefix", "Use either slop or prefix.")
    }
    phraseSlop = slop === 0 && prefix ? undefined : (slop as number | undefined)
    phrasePrefix = prefix as boolean | undefined
  }

  // Auto-fix: $smart on boolean/number → $eq (smart is only meaningful for strings)
  if (operator === "smart" && (typeof value === "boolean" || typeof value === "number")) {
    operator = "eq"
  }

  return {
    id: generateId(),
    type: "condition",
    condition: {
      field,
      operator,
      value: value as string | number | boolean | string[],
      fuzzyDistance,
      phraseSlop,
      phrasePrefix,
    },
  }
}

/** Parse a single field condition into a QueryNode */
const parseFieldCondition = (field: string, fieldValue: unknown): QueryNode => {
  // Shorthand: { field: "value" } → $eq for boolean/number, $smart for strings
  if (!isPlainObject(fieldValue)) {
    const operator: FieldOperator =
      typeof fieldValue === "boolean" || typeof fieldValue === "number" ? "eq" : "smart"
    return {
      id: generateId(),
      type: "condition",
      condition: {
        field,
        operator,
        value: fieldValue as string | number | boolean | string[],
      },
    }
  }

  // Full format: { field: { $operator: value, $boost?: n } }
  const boost = "$boost" in fieldValue ? parseBoost(fieldValue.$boost) : undefined
  const conditions = Object.entries(fieldValue)
    .filter(([key]) => key !== "$boost")
    .map(([key, value]) => {
      const op = ALL_OPERATORS.find((op) => key === `$${op}`)
      return op
        ? parseOperator(field, op, value)
        : unsupported(
            `The "${key}" operator`,
            `Use one of ${ALL_OPERATORS.map((o) => `$${o}`).join(", ")}.`
          )
    })

  if (conditions.length === 0) {
    return unsupported("A field without an operator", "Add an operator like $eq.")
  }

  // The server rejects two lower or two upper bounds on the same field
  const ops = new Set(conditions.map((c) => (c.type === "condition" ? c.condition.operator : "")))
  if ((ops.has("gt") && ops.has("gte")) || (ops.has("lt") && ops.has("lte"))) {
    unsupported("Two lower or upper bounds on one field", "Use one of $gt/$gte and $lt/$lte.")
  }

  if (conditions.length === 1) {
    return { ...conditions[0], boost }
  }

  // Multiple operators: { price: { $gte: 10, $lte: 100 } } → all of them must match
  return { id: generateId(), type: "group", groupOperator: "and", children: conditions, boost }
}

/** Convert the keys of an object body ({ $and: { ... } } or { $or: { ... } }) into a group */
const parseMultiFieldObject = (
  obj: Record<string, unknown>,
  operator: GroupOperator
): QueryNode & { type: "group" } => {
  if ("$and" in obj && "$or" in obj && !legacy) unsupportedAndOr()

  const group: QueryNode & { type: "group" } = {
    id: generateId(),
    type: "group",
    groupOperator: operator,
    children: [],
  }

  for (const [key, value] of Object.entries(obj)) {
    switch (key) {
      case "$boost": {
        group.boost = parseBoost(value)
        break
      }
      case "$and":
      case "$or": {
        group.children.push(parseGroup(value, key === "$and" ? "and" : "or"))
        break
      }
      case "$mustNot": {
        if (operator === "and") {
          addMustNotChildren(group, value)
        } else {
          // Inside $or, $mustNot is one more alternative: everything except the given documents
          group.children.push(parseMustNotOnly(value))
        }
        break
      }
      default: {
        if (isOperatorKey(key)) {
          unsupported(`The ${key} operator`, "Keep using the Code Editor for this query.")
        } else {
          group.children.push(parseFieldCondition(key, value))
        }
      }
    }
  }

  return group
}

/** Parse an object that only has $mustNot into an AND group with negated children */
const parseMustNotOnly = (mustNotValue: unknown): QueryNode & { type: "group" } => {
  const group: QueryNode & { type: "group" } = {
    id: generateId(),
    type: "group",
    groupOperator: "and",
    children: [],
  }
  addMustNotChildren(group, mustNotValue)
  return group
}

const isMustNotOnly = (value: unknown): value is { $mustNot: unknown } =>
  isPlainObject(value) && Object.keys(value).length === 1 && "$mustNot" in value

/** Parse $and/$or group */
const parseGroup = (
  groupValue: unknown,
  operator: GroupOperator
): QueryNode & { type: "group" } => {
  // Array-based: { $and: [{ ... }, { ... }] }
  if (Array.isArray(groupValue)) {
    if (groupValue.length === 0) {
      return unsupported(`An empty $${operator} array`, "Add a condition or remove it.")
    }
    const group: QueryNode & { type: "group" } = {
      id: generateId(),
      type: "group",
      groupOperator: operator,
      children: [],
    }

    for (const child of groupValue) {
      if (!isPlainObject(child)) {
        return unsupported(`A non-object $${operator} item`, "Use objects as items.")
      }

      // An $and item with only $mustNot adds its exclusions to the group
      if (operator === "and" && isMustNotOnly(child)) {
        addMustNotChildren(group, child.$mustNot)
        continue
      }

      const node = objectToQueryNode(child)
      if (node) {
        group.children.push(node)
      } else if (operator === "or" && groupValue.length > 1 && !legacy) {
        // {} matches every document, which an OR group of the builder can't express.
        // Older builders wrote empty groups this way, which meant no constraint.
        unsupported("An empty object inside $or", "It matches every document, remove it.")
      }
    }

    return group
  }

  // Object-based: { $and: { field1: v1, field2: v2 } }
  if (isPlainObject(groupValue)) {
    return parseMultiFieldObject(groupValue, operator)
  }

  return unsupported(`A non-object $${operator} value`, "Use an object or an array of objects.")
}

/** Add $mustNot entries as negated children to a group */
const addMustNotChildren = (group: QueryNode & { type: "group" }, mustNotValue: unknown): void => {
  // Array form excludes documents matching any item.
  // Object form excludes documents matching any of its keys, each key is its own item.
  if (Array.isArray(mustNotValue) && mustNotValue.length === 0) {
    return unsupported("An empty $mustNot array", "Add a condition or remove it.")
  }
  const items = Array.isArray(mustNotValue)
    ? mustNotValue
    : isPlainObject(mustNotValue)
      ? // Older builders wrote a negated group as one object, e.g. { $and: ..., $boost: 2 }
        legacy && Object.keys(mustNotValue).some((key) => isOperatorKey(key))
        ? [mustNotValue]
        : Object.entries(mustNotValue).map(([key, value]) =>
            key === "$boost"
              ? unsupported(
                  "$boost inside $mustNot",
                  "Remove it, excluded documents aren't scored."
                )
              : { [key]: value }
          )
      : unsupported("A non-object $mustNot value", "Use an object or an array of objects.")

  for (const item of items) {
    if (!isPlainObject(item)) unsupported("A non-object $mustNot item", "Use objects as items.")
    const child = objectToQueryNode(item as Record<string, unknown>)
    if (!child) {
      if (legacy) continue
      return unsupported("An empty object inside $mustNot", "Remove it.")
    }
    child.not = true
    group.children.push(child)
  }
}

const unsupportedAndOr = (): never =>
  unsupported(
    "Using $and and $or on the same level",
    "Put them in an array: $and: [{ $and: ... }, { $or: ... }]."
  )

/** Apply a $boost to a node, wrapping it if it already has its own boost */
const withBoost = (node: QueryNode, boost: number | undefined): QueryNode => {
  if (boost === undefined) return node
  if (node.boost === undefined) return { ...node, boost }
  return { id: generateId(), type: "group", groupOperator: "and", children: [node], boost }
}

/** Parse a raw query object into a QueryNode */
const objectToQueryNode = (obj: Record<string, unknown>): QueryNode | null => {
  const keys = Object.keys(obj)
  if (keys.length === 0) return null

  const boost = "$boost" in obj ? parseBoost(obj.$boost) : undefined
  const positiveKeys = keys.filter((key) => key !== "$boost" && key !== "$mustNot")

  if ("$or" in obj && positiveKeys.length > 1) {
    // Older builders meant AND here, parseMultiFieldObject reads it that way
    if (!legacy) {
      if ("$and" in obj) unsupportedAndOr()
      // Next to other conditions, $or only boosts the score of documents that match it
      unsupported(
        "$or next to other conditions",
        "To require it, use $and: [{ ...other conditions }, { $or: ... }]."
      )
    }
    return parseMultiFieldObject(obj, "and")
  }

  // Only $mustNot: everything except the excluded documents
  if (positiveKeys.length === 0) {
    if ("$mustNot" in obj) return withBoost(parseMustNotOnly(obj.$mustNot), boost)
    // Older builders wrote an empty group with a boost this way
    if (legacy) return null
    return unsupported("$boost without a query", "Add a condition next to it.")
  }

  // A single $and/$or group, possibly with $mustNot as sibling
  if (positiveKeys.length === 1 && (positiveKeys[0] === "$and" || positiveKeys[0] === "$or")) {
    const operator: GroupOperator = positiveKeys[0] === "$and" ? "and" : "or"
    const group = parseGroup(obj[positiveKeys[0]], operator)
    if ("$mustNot" in obj) addMustNotChildren(group, obj.$mustNot)
    return withBoost(group, boost)
  }

  // A single field condition
  if (positiveKeys.length === 1 && !isOperatorKey(positiveKeys[0]) && !("$mustNot" in obj)) {
    return withBoost(parseFieldCondition(positiveKeys[0], obj[positiveKeys[0]]), boost)
  }

  // Multiple fields, possibly with $and/$mustNot → implicit AND
  return parseMultiFieldObject(obj, "and")
}

/**
 * Parse a query string into a QueryState object
 * Returns null if parsing fails
 */
export const parseQueryString = (
  queryString: string,
  options?: ParseOptions
): QueryState | null => {
  const result = parseQueryStringWithError(queryString, options)
  return result.success ? result.state : null
}

export type ParseOptions = {
  /**
   * Also accept the shapes older builder versions wrote, read with the builder's intent.
   * Only for queries the builder itself stored (builder mode on load or index switch),
   * never for an explicit switch from the code editor, where the user may mean e.g.
   * { field, $or } as an optional score boost.
   */
  allowLegacy?: boolean
}

/**
 * Parse a query string with detailed error information
 * Use this when you need to know why parsing failed
 */
export const parseQueryStringWithError = (
  queryString: string,
  { allowLegacy = false }: ParseOptions = {}
): ParseResult => {
  const result = parseQueryStringWithMode(queryString, false)
  if (result.success || !allowLegacy) return result
  // Fall back to the legacy reading only when the strict one fails, so it never changes
  // the meaning of a query the strict parser accepts
  const legacyResult = parseQueryStringWithMode(queryString, true)
  return legacyResult.success ? legacyResult : result
}

const parseQueryStringWithMode = (queryString: string, legacyMode: boolean): ParseResult => {
  if (!queryString || queryString.trim() === "" || queryString.trim() === "{}") {
    return { success: true, state: createInitialQueryState() }
  }

  const obj = parseJSObjectLiteral<Record<string, unknown>>(queryString)
  if (!isPlainObject(obj)) return { success: false, error: "Invalid query syntax" }

  try {
    legacy = legacyMode
    // Normalize $must → $and, $should → $or
    const normalizedObj = normalizeOperators(obj) as Record<string, unknown>

    const root = objectToQueryNode(normalizedObj)
    if (!root) return { success: true, state: createInitialQueryState() }

    // Ensure root is always a group
    if (root.type === "condition") {
      return {
        success: true,
        state: {
          root: {
            id: generateId(),
            type: "group",
            groupOperator: "and",
            children: [root],
          },
        },
      }
    }
    return { success: true, state: { root } }
  } catch (error) {
    if (error instanceof UnsupportedQueryError) return { success: false, error: error.message }
    return { success: false, error: "Failed to parse query" }
  } finally {
    legacy = false
  }
}

/**
 * Returns why a query can't be opened in the UI query builder without changing it,
 * or undefined if it can
 */
export const getQueryBuilderError = (
  queryString: string,
  options?: ParseOptions
): string | undefined => {
  if (hasMustShouldCombination(queryString)) return MUST_SHOULD_ERROR
  const result = parseQueryStringWithError(queryString, options)
  return result.success ? undefined : result.error
}

// ============================================================================
// FACTORY FUNCTIONS
// ============================================================================

export const createEmptyCondition = (
  fieldInfos?: FieldInfo[]
): QueryNode & { type: "condition" } => {
  // Smart defaults based on schema
  if (fieldInfos && fieldInfos.length > 0) {
    // Priority 1: Boolean field with value true
    const booleanField = fieldInfos.find((f) => f.type === "boolean")
    if (booleanField) {
      return {
        id: generateId(),
        type: "condition",
        condition: { field: booleanField.name, operator: "eq", value: true },
      }
    }

    // Priority 2: Number field with > 0
    const numberField = fieldInfos.find((f) => f.type === "number")
    if (numberField) {
      return {
        id: generateId(),
        type: "condition",
        condition: { field: numberField.name, operator: "gt", value: 0 },
      }
    }

    // Priority 3: First field with empty value
    return {
      id: generateId(),
      type: "condition",
      condition: { field: fieldInfos[0].name, operator: "eq", value: "" },
    }
  }

  // No field infos available
  return {
    id: generateId(),
    type: "condition",
    condition: { field: "", operator: "eq", value: "" },
  }
}

export const createEmptyGroup = (
  operator: GroupOperator = "and"
): QueryNode & { type: "group" } => ({
  id: generateId(),
  type: "group",
  groupOperator: operator,
  children: [],
})

export const createInitialQueryState = (): QueryState => ({
  root: {
    id: generateId(),
    type: "group",
    groupOperator: "and",
    children: [],
  },
})
