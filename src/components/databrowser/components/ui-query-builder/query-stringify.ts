/**
 * Query Stringify
 *
 * Converts QueryState objects to JS object literal strings.
 * Uses JSON.stringify for the heavy lifting, then removes unnecessary quotes from keys.
 */

import type { FieldOperator, QueryNode, QueryState } from "./types"

// ============================================================================
// JSON TO JS LITERAL CONVERSION
// ============================================================================

/**
 * Convert JSON string to JS object literal string.
 * Removes quotes from keys that are valid identifiers.
 */
const jsonToJsLiteral = (json: string): string => {
  // Match quoted keys that are valid JS identifiers and remove the quotes
  // Valid identifier: starts with $, letter, or underscore, followed by word chars or $
  return json.replaceAll(/"([$A-Z_a-z][\w$]*)"\s*:/g, "$1:")
}

/**
 * Stringify with pretty formatting, then convert to JS literal
 */
const toJsLiteral = (obj: unknown): string => {
  return jsonToJsLiteral(JSON.stringify(obj, null, 2))
}

// ============================================================================
// QUERY NODE TO OBJECT CONVERSION
// ============================================================================

/** Build the operator value for a condition (handles fuzzy specially) */
const buildOperatorValue = (
  operator: FieldOperator,
  value: unknown,
  fuzzyDistance?: 1 | 2
): unknown => {
  if (operator === "fuzzy" && fuzzyDistance) {
    return { value, distance: fuzzyDistance }
  }
  return value
}

/** Convert a condition node to a query object */
const conditionToObject = (node: QueryNode & { type: "condition" }): Record<string, unknown> => {
  const { field, operator, value, boost: conditionBoost, fuzzyDistance } = node.condition
  const effectiveBoost = node.boost ?? conditionBoost

  // Shorthand for $eq without boost or not
  if (operator === "eq" && !effectiveBoost && !node.not) {
    return { [field]: value }
  }

  // Full format
  const fieldCondition: Record<string, unknown> = {
    [`$${operator}`]: buildOperatorValue(operator, value, fuzzyDistance),
  }

  // Apply boost to the field condition - node.boost takes priority over conditionBoost
  const finalBoost = node.boost ?? conditionBoost
  if (finalBoost && finalBoost !== 1) {
    fieldCondition.$boost = finalBoost
  }

  const condition: Record<string, unknown> = { [field]: fieldCondition }

  if (node.not) {
    return { $mustNot: [condition] }
  }

  return condition
}

/** Check if all children are simple $eq conditions that can be merged */
const canMergeChildren = (children: QueryNode[]): boolean => {
  return children.every(
    (child) =>
      child.type === "condition" &&
      !child.not &&
      !child.boost &&
      child.condition.operator === "eq" &&
      !child.condition.boost
  )
}

/** Merge simple conditions into a single object */
const mergeConditions = (children: QueryNode[], boost?: number): Record<string, unknown> => {
  const merged: Record<string, unknown> = {}
  for (const child of children) {
    if (child.type === "condition") {
      merged[child.condition.field] = child.condition.value
    }
  }
  if (boost && boost !== 1) {
    merged.$boost = boost
  }
  return merged
}

/** Convert a group node to a query object */
const groupToObject = (
  node: QueryNode & { type: "group" },
  isRoot: boolean
): Record<string, unknown> => {
  const { groupOperator, children, boost, not } = node

  // Empty root group should return empty object, not $and: []
  if (isRoot && children.length === 0 && !not && !boost) {
    return {}
  }

  // Optimization: flatten root AND with single child (no not/boost)
  if (isRoot && groupOperator === "and" && children.length === 1 && !not && !boost) {
    return queryNodeToObject(children[0], false)
  }

  // Optimization: merge simple $eq conditions
  if (children.length > 0 && !not && canMergeChildren(children)) {
    const merged = mergeConditions(children, boost)
    if (isRoot && groupOperator === "and") {
      return merged
    }
    const result: Record<string, unknown> = { [`$${groupOperator}`]: merged }
    if (boost && boost !== 1) {
      result.$boost = boost
    }
    return result
  }

  // Standard format: { $and: [...] } or { $or: [...] }
  const childObjects = children.map((child) => queryNodeToObject(child, false))
  const group: Record<string, unknown> = { [`$${groupOperator}`]: childObjects }

  if (boost && boost !== 1) {
    group.$boost = boost
  }

  if (not) {
    // OR group with not → flatten to $mustNot array
    if (groupOperator === "or" && !boost) {
      return { $mustNot: childObjects }
    }
    return { $mustNot: [group] }
  }

  return group
}

/** Convert a QueryNode to a raw query object */
const queryNodeToObject = (node: QueryNode, isRoot: boolean = false): Record<string, unknown> => {
  if (node.type === "condition") {
    return conditionToObject(node as QueryNode & { type: "condition" })
  }
  if (node.type === "group") {
    return groupToObject(node as QueryNode & { type: "group" }, isRoot)
  }
  return {}
}

// ============================================================================
// PUBLIC API
// ============================================================================

/**
 * Stringify a QueryState object to a JS object literal string
 */
export const stringifyQueryState = (state: QueryState): string => {
  const obj = queryNodeToObject(state.root, true)
  return toJsLiteral(obj)
}
