import type { FieldOperator, QueryNode, QueryState } from "./types"

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

/** Convert a condition node to a query object (not flag is handled by parent group) */
const conditionToObject = (node: QueryNode & { type: "condition" }): Record<string, unknown> => {
  const { field, operator, value, boost: conditionBoost, fuzzyDistance } = node.condition
  const effectiveBoost = node.boost ?? conditionBoost

  // Shorthand for $eq without boost
  if (operator === "eq" && !effectiveBoost) {
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

  return { [field]: fieldCondition }
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

  // Separate children into normal and negated ($mustNot)
  const normalChildren = children.filter((c) => !c.not)
  const negatedChildren = children.filter((c) => c.not)

  // Empty root group should return empty object, not $and: []
  if (isRoot && children.length === 0 && !not && !boost) {
    return {}
  }

  // If the group itself is negated, convert without not and wrap in $mustNot
  if (not) {
    const withoutNot = { ...node, not: undefined } as QueryNode & { type: "group" }
    const inner = groupToObject(withoutNot, false)
    // OR group with not and no negated children → flatten to $mustNot array
    if (groupOperator === "or" && !boost && negatedChildren.length === 0) {
      const childObjects = normalChildren.map((child) => queryNodeToObject(child, false))
      return { $mustNot: childObjects }
    }
    return { $mustNot: [inner] }
  }

  // Optimization: flatten root AND with single normal child (no negated, no boost)
  if (
    isRoot &&
    groupOperator === "and" &&
    normalChildren.length === 1 &&
    negatedChildren.length === 0 &&
    !boost
  ) {
    return queryNodeToObject(normalChildren[0], false)
  }

  // Optimization: merge simple $eq conditions (only when no negated children)
  if (
    normalChildren.length > 0 &&
    negatedChildren.length === 0 &&
    canMergeChildren(normalChildren)
  ) {
    const merged = mergeConditions(normalChildren, boost)
    if (isRoot && groupOperator === "and") {
      return merged
    }
    const result: Record<string, unknown> = { [`$${groupOperator}`]: merged }
    if (boost && boost !== 1) {
      result.$boost = boost
    }
    return result
  }

  // Standard format: $and/$or for normal children, $mustNot as sibling for negated children
  const result: Record<string, unknown> = {}

  if (normalChildren.length > 0) {
    result[`$${groupOperator}`] = normalChildren.map((child) => queryNodeToObject(child, false))
  }

  if (negatedChildren.length > 0) {
    result.$mustNot = negatedChildren.map((child) => {
      const withoutNot = { ...child, not: undefined }
      return queryNodeToObject(withoutNot, false)
    })
  }

  if (boost && boost !== 1) {
    result.$boost = boost
  }

  return result
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

export const stringifyQueryState = (state: QueryState): string => {
  const obj = queryNodeToObject(state.root, true)
  return toJsLiteral(obj)
}
