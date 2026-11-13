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

const isOperatorKey = (key: string): boolean => key.startsWith("$")

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

    result[normalizedKey] = normalizeOperators(value)
  }

  return result
}

/** Check if an object has $operator keys (like $eq, $in, $fuzzy) */
const isFieldConditionObject = (obj: unknown): obj is Record<string, unknown> => {
  if (!obj || typeof obj !== "object" || Array.isArray(obj)) return false
  const keys = Object.keys(obj)
  return keys.some((key) => ALL_OPERATORS.some((op) => key === `$${op}`))
}

/** Parse a single field condition into a QueryNode */
const parseFieldCondition = (field: string, fieldValue: unknown): QueryNode => {
  // Shorthand: { field: "value" } → $eq for boolean/number, $smart for strings
  if (!isFieldConditionObject(fieldValue)) {
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

  // Full format: { field: { $operator: value } }
  const fieldObj = fieldValue as Record<string, unknown>
  let operator: FieldOperator = "eq"
  let value: unknown = ""
  let fuzzyDistance: 1 | 2 | undefined
  let phraseSlop: number | undefined
  let phrasePrefix: boolean | undefined
  let boost: number | undefined

  for (const op of ALL_OPERATORS) {
    const key = `$${op}`
    if (key in fieldObj) {
      operator = op
      value = fieldObj[key]

      // Handle fuzzy: { $fuzzy: { value: "x", distance: 2 } }
      if (op === "fuzzy" && typeof value === "object" && value !== null) {
        const fuzzyObj = value as { value?: unknown; distance?: number }
        value = fuzzyObj.value ?? ""
        fuzzyDistance = (fuzzyObj.distance as 1 | 2) ?? 1
      }

      // Handle phrase: { $phrase: "text" } or { $phrase: { value: "text", slop?: n, prefix?: bool } }
      if (op === "phrase" && typeof value === "object" && value !== null) {
        const phraseObj = value as { value?: unknown; slop?: number; prefix?: boolean }
        value = phraseObj.value ?? ""
        phraseSlop = phraseObj.slop
        phrasePrefix = phraseObj.prefix
      }
      break
    }
  }

  // Auto-fix: $smart on boolean/number → $eq (smart is only meaningful for strings)
  if (operator === "smart" && (typeof value === "boolean" || typeof value === "number")) {
    operator = "eq"
  }

  if ("$boost" in fieldObj) {
    boost = fieldObj.$boost as number
  }

  return {
    id: generateId(),
    type: "condition",
    boost,
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

/** Convert multiple field keys into an AND/OR group */
const parseMultiFieldObject = (
  obj: Record<string, unknown>,
  operator: GroupOperator
): QueryNode & { type: "group" } => {
  const children: QueryNode[] = []
  let boost: number | undefined

  for (const [key, value] of Object.entries(obj)) {
    switch (key) {
      case "$boost": {
        boost = value as number
        break
      }
      case "$and":
      case "$or": {
        const nestedGroup = parseGroup(value, key === "$and" ? "and" : "or")
        if (nestedGroup) children.push(nestedGroup)
        break
      }
      case "$mustNot": {
        const negated = parseNegatedChildren(value)
        // In an OR, all the exclusions together are one alternative
        if (operator === "or" && negated.length > 1) {
          children.push({
            id: generateId(),
            type: "group",
            groupOperator: "and",
            children: negated,
          })
        } else {
          children.push(...negated)
        }
        break
      }
      default: {
        if (!isOperatorKey(key)) children.push(parseFieldCondition(key, value))
      }
    }
  }

  return { id: generateId(), type: "group", groupOperator: operator, children, boost }
}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

/** Negate a node, a node that is already negated is wrapped so both negations are kept */
const negate = (node: QueryNode): QueryNode =>
  node.not
    ? { id: generateId(), type: "group", groupOperator: "and", children: [node], not: true }
    : { ...node, not: true }

/**
 * The nodes a $mustNot value excludes. Each array item is excluded on its own, and so is
 * each key of an object form: { a: 1, b: 2 } excludes a and b, not (a and b).
 */
const parseExcludedNodes = (mustNotValue: unknown): QueryNode[] => {
  const items = Array.isArray(mustNotValue)
    ? mustNotValue.filter((item) => isPlainObject(item))
    : isPlainObject(mustNotValue)
      ? Object.entries(mustNotValue)
          .filter(([key]) => key !== "$boost")
          .map(([key, value]) => ({ [key]: value }))
      : []
  return items.map((item) => objectToQueryNode(item)).filter((n): n is QueryNode => n !== null)
}

/** The nodes a $mustNot value excludes, as negated children of an AND */
const parseNegatedChildren = (mustNotValue: unknown): QueryNode[] =>
  parseExcludedNodes(mustNotValue).map((node) => negate(node))

/** Parse a standalone $mustNot: excluding a and b is not (a or b) */
const parseMustNot = (notValue: unknown): QueryNode | null => {
  const excluded = parseExcludedNodes(notValue)
  if (excluded.length === 0) return null
  if (excluded.length === 1) return negate(excluded[0])
  return { id: generateId(), type: "group", groupOperator: "or", children: excluded, not: true }
}

/** Parse $and/$or group */
const parseGroup = (
  groupValue: unknown,
  operator: GroupOperator,
  boost?: number
): QueryNode | null => {
  // Array-based: { $and: [{ ... }, { ... }] }
  if (Array.isArray(groupValue)) {
    return {
      id: generateId(),
      type: "group",
      groupOperator: operator,
      children: groupValue
        .map((child) => objectToQueryNode(child as Record<string, unknown>))
        .filter((n): n is QueryNode => n !== null),
      boost,
    }
  }

  // Object-based: { $and: { field1: v1, field2: v2 } }
  if (typeof groupValue === "object" && groupValue !== null) {
    const group = parseMultiFieldObject(groupValue as Record<string, unknown>, operator)
    if (boost !== undefined) group.boost = boost
    return group
  }

  return null
}

/** Parse a raw query object into a QueryNode */
const objectToQueryNode = (obj: Record<string, unknown>, isRoot = false): QueryNode | null => {
  if (!obj || typeof obj !== "object") return null

  const keys = Object.keys(obj)
  if (keys.length === 0) return null

  const hasGroup = "$and" in obj || "$or" in obj
  const hasMustNot = "$mustNot" in obj
  const nonOperatorKeys = keys.filter((key) => !isOperatorKey(key))

  // Handle $and/$or groups (possibly with $mustNot or field conditions as siblings)
  if (hasGroup) {
    const hasBothGroups = "$and" in obj && "$or" in obj
    const operator: GroupOperator = "$and" in obj ? "and" : "or"
    const groupValue = obj["$and"] ?? obj["$or"]
    const boost = "$boost" in obj ? (obj.$boost as number) : undefined
    const negatedChildren = hasMustNot ? parseNegatedChildren(obj.$mustNot) : []

    // An $and takes the sibling $mustNot as negated children. The server ANDs an $or with
    // its siblings ({ $or: a, $mustNot: b } is a and not b), so then it is wrapped in an AND.
    const isLoneGroup =
      nonOperatorKeys.length === 0 &&
      !hasBothGroups &&
      (operator === "and" || negatedChildren.length === 0)
    let groupNode = parseGroup(groupValue, operator)
    if (!groupNode || groupNode.type !== "group") return groupNode

    if (isLoneGroup) {
      if (boost !== undefined) {
        // { $and: { ..., $boost: a }, $boost: b } has two boosts, keep both
        groupNode =
          groupNode.boost === undefined
            ? { ...groupNode, boost }
            : {
                id: generateId(),
                type: "group",
                groupOperator: "and",
                children: [groupNode],
                boost,
              }
      }
      if (groupNode.type === "group") groupNode.children.push(...negatedChildren)
      return groupNode
    }

    // Sibling field conditions, a sibling $mustNot next to an $or, or $and next to $or (as
    // older builders wrote an AND group containing both) → wrap in AND.
    // An $or without conditions ([{}]) matches every document, so it adds nothing.
    const fieldChildren = nonOperatorKeys.map((key) => parseFieldCondition(key, obj[key]))
    const orNode = hasBothGroups ? parseGroup(obj.$or, "or") : null
    const isMatchAll = (node: QueryNode | null) =>
      node?.type === "group" && node.groupOperator === "or" && node.children.length === 0
    return {
      id: generateId(),
      type: "group",
      groupOperator: "and",
      children: [
        ...fieldChildren,
        ...[groupNode, orNode].filter(
          (node): node is QueryNode => node !== null && !isMatchAll(node)
        ),
        ...negatedChildren,
      ],
      boost,
    }
  }

  // Handle $mustNot (possibly with field conditions at the same level)
  if (hasMustNot) {
    // Field conditions + $mustNot → AND group with negated children
    if (nonOperatorKeys.length > 0) return parseMultiFieldObject(obj, "and")
    // Standalone $mustNot
    return parseMustNot(obj.$mustNot)
  }

  // Field conditions only
  if (nonOperatorKeys.length === 0) return null

  const nodeBoost = "$boost" in obj ? (obj.$boost as number) : undefined

  if (nonOperatorKeys.length === 1) {
    const field = nonOperatorKeys[0]
    const condition = parseFieldCondition(field, obj[field])
    if (nodeBoost === undefined) return condition
    // A numeric node boost can move onto the field, unless the field has its own boost.
    // At the root it stays on the root group, where the builder put it.
    if (!isRoot && typeof nodeBoost === "number" && condition.boost === undefined) {
      condition.boost = nodeBoost
      return condition
    }
    return {
      id: generateId(),
      type: "group",
      groupOperator: "and",
      children: [condition],
      boost: nodeBoost,
    }
  }

  // Multiple fields at root → implicit AND
  return parseMultiFieldObject(obj, "and")
}

/**
 * Parse a query string into a QueryState object
 * Returns null if parsing fails
 */
export const parseQueryString = (queryString: string): QueryState | null => {
  const result = parseQueryStringWithError(queryString)
  return result.success ? result.state : null
}

/**
 * Parse a query string with detailed error information
 * Use this when you need to know why parsing failed
 */
export const parseQueryStringWithError = (queryString: string): ParseResult => {
  if (!queryString || queryString.trim() === "" || queryString.trim() === "{}") {
    return { success: true, state: createInitialQueryState() }
  }

  try {
    const obj = parseJSObjectLiteral<Record<string, unknown>>(queryString)
    // Only an object is a query, an array like [1] would otherwise read as a field named "0"
    if (!obj || typeof obj !== "object" || Array.isArray(obj)) {
      return { success: false, error: "Invalid query syntax" }
    }
    // An empty object written differently, like { }
    if (Object.keys(obj).length === 0) return { success: true, state: createInitialQueryState() }

    // Normalize $must → $and, $should → $or
    const normalizedObj = normalizeOperators(obj) as Record<string, unknown>

    const root = objectToQueryNode(normalizedObj, true)
    if (root) {
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
    }
  } catch {
    // Failed to parse
  }

  return { success: false, error: "Failed to parse query" }
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
