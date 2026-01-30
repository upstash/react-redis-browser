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
  // Shorthand: { field: "value" } → $eq
  if (!isFieldConditionObject(fieldValue)) {
    return {
      id: generateId(),
      type: "condition",
      condition: {
        field,
        operator: "eq",
        value: fieldValue as string | number | boolean | string[],
      },
    }
  }

  // Full format: { field: { $operator: value } }
  const fieldObj = fieldValue as Record<string, unknown>
  let operator: FieldOperator = "eq"
  let value: unknown = ""
  let fuzzyDistance: 1 | 2 | undefined
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
      break
    }
  }

  if ("$boost" in fieldObj) {
    boost = fieldObj.$boost as number
  }

  return {
    id: generateId(),
    type: "condition",
    condition: {
      field,
      operator,
      value: value as string | number | boolean | string[],
      fuzzyDistance,
      boost,
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
    if (key === "$boost") {
      boost = value as number
    } else if (!isOperatorKey(key)) {
      children.push(parseFieldCondition(key, value))
    }
  }

  return { id: generateId(), type: "group", groupOperator: operator, children, boost }
}

/** Parse $mustNot wrapper, returns node with not=true */
const parseMustNot = (notValue: unknown): QueryNode | null => {
  if (Array.isArray(notValue)) {
    if (notValue.length === 0) return null

    if (notValue.length === 1) {
      const innerNode = objectToQueryNode(notValue[0] as Record<string, unknown>)
      if (innerNode) innerNode.not = true
      return innerNode
    }

    // Multiple elements: OR semantics within $mustNot
    const children = notValue
      .map((child) => objectToQueryNode(child as Record<string, unknown>))
      .filter((n): n is QueryNode => n !== null)

    if (children.length === 0) return null
    return { id: generateId(), type: "group", groupOperator: "or", children, not: true }
  }

  // Object form: { $mustNot: { field: value } }
  if (typeof notValue === "object" && notValue !== null) {
    const innerNode = objectToQueryNode(notValue as Record<string, unknown>)
    if (innerNode) innerNode.not = true
    return innerNode
  }

  return null
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

/** Add $mustNot entries as negated children to a group */
const addMustNotChildren = (group: QueryNode & { type: "group" }, mustNotValue: unknown): void => {
  if (Array.isArray(mustNotValue)) {
    for (const item of mustNotValue) {
      const child = objectToQueryNode(item as Record<string, unknown>)
      if (child) {
        child.not = true
        group.children.push(child)
      }
    }
  } else if (typeof mustNotValue === "object" && mustNotValue !== null) {
    const child = objectToQueryNode(mustNotValue as Record<string, unknown>)
    if (child) {
      child.not = true
      group.children.push(child)
    }
  }
}

/** Parse a raw query object into a QueryNode */
const objectToQueryNode = (obj: Record<string, unknown>): QueryNode | null => {
  if (!obj || typeof obj !== "object") return null

  const keys = Object.keys(obj)
  if (keys.length === 0) return null

  const hasGroup = "$and" in obj || "$or" in obj
  const hasMustNot = "$mustNot" in obj
  const nonOperatorKeys = keys.filter((key) => !isOperatorKey(key))

  // Handle $and/$or groups (possibly with $mustNot as sibling)
  if (hasGroup) {
    const operator: GroupOperator = "$and" in obj ? "and" : "or"
    const groupValue = obj["$and"] ?? obj["$or"]
    const boost = "$boost" in obj ? (obj.$boost as number) : undefined
    const groupNode = parseGroup(groupValue, operator, boost)

    if (groupNode && groupNode.type === "group" && hasMustNot) {
      addMustNotChildren(groupNode, obj.$mustNot)
    }

    return groupNode
  }

  // Handle $mustNot (possibly with field conditions at the same level)
  if (hasMustNot) {
    if (nonOperatorKeys.length > 0) {
      // Field conditions + $mustNot → AND group with negated children
      const group = parseMultiFieldObject(obj, "and")
      addMustNotChildren(group, obj.$mustNot)
      return group
    }
    // Standalone $mustNot
    return parseMustNot(obj.$mustNot)
  }

  // Field conditions only
  if (nonOperatorKeys.length === 0) return null

  const nodeBoost = "$boost" in obj ? (obj.$boost as number) : undefined

  if (nonOperatorKeys.length === 1) {
    const field = nonOperatorKeys[0]
    const condition = parseFieldCondition(field, obj[field])
    if (nodeBoost !== undefined) condition.boost = nodeBoost
    return condition
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
    if (!obj) return { success: false, error: "Invalid query syntax" }

    // Normalize $must → $and, $should → $or
    const normalizedObj = normalizeOperators(obj) as Record<string, unknown>

    const root = objectToQueryNode(normalizedObj)
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
