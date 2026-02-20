import { toJsLiteral } from "@/lib/utils"

import type { FieldOperator, QueryNode, QueryState } from "./types"

/** Build the operator value for a condition (handles fuzzy and phrase specially) */
const buildOperatorValue = (
  operator: FieldOperator,
  value: unknown,
  fuzzyDistance?: 1 | 2,
  phraseSlop?: number,
  phrasePrefix?: boolean
): unknown => {
  if (operator === "fuzzy" && fuzzyDistance) {
    return { value, distance: fuzzyDistance }
  }
  if (operator === "phrase") {
    if (phraseSlop !== undefined) {
      return { value, slop: phraseSlop }
    }
    if (phrasePrefix) {
      return { value, prefix: true }
    }
  }
  return value
}

/** Convert a condition node to a query object (not flag is handled by parent group) */
const conditionToObject = (node: QueryNode & { type: "condition" }): Record<string, unknown> => {
  const {
    field,
    operator,
    value,
    boost: conditionBoost,
    fuzzyDistance,
    phraseSlop,
    phrasePrefix,
  } = node.condition
  const effectiveBoost = node.boost ?? conditionBoost

  // Shorthand for $smart without boost, or $eq on boolean/number without boost
  const isCollapsibleEq =
    operator === "eq" && (typeof value === "boolean" || typeof value === "number")
  if ((operator === "smart" || isCollapsibleEq) && !effectiveBoost) {
    return { [field]: value }
  }

  // Full format
  const fieldCondition: Record<string, unknown> = {
    [`$${operator}`]: buildOperatorValue(operator, value, fuzzyDistance, phraseSlop, phrasePrefix),
  }

  // Apply boost to the field condition - node.boost takes priority over conditionBoost
  const finalBoost = node.boost ?? conditionBoost
  if (finalBoost && finalBoost !== 1) {
    fieldCondition.$boost = finalBoost
  }

  return { [field]: fieldCondition }
}

/** Check if all children are single-field conditions with unique fields that can be merged into object form */
const canMergeChildren = (children: QueryNode[]): boolean => {
  if (!children.every((child) => child.type === "condition" && !child.not)) return false
  const fields = children.map((c) => (c as QueryNode & { type: "condition" }).condition.field)
  return new Set(fields).size === fields.length
}

/** Merge conditions into a single object using conditionToObject for each */
const mergeConditions = (children: QueryNode[], boost?: number): Record<string, unknown> => {
  const merged: Record<string, unknown> = {}
  for (const child of children) {
    if (child.type === "condition") {
      Object.assign(merged, conditionToObject(child as QueryNode & { type: "condition" }))
    }
  }
  if (boost && boost !== 1) {
    merged.$boost = boost
  }
  return merged
}

/** Build $mustNot value: object form for single item, array for multiple */
const buildMustNot = (
  negatedChildren: QueryNode[]
): Record<string, unknown> | Record<string, unknown>[] => {
  const negatedObjects = negatedChildren.map((child) => {
    const withoutNot = { ...child, not: undefined }
    return queryNodeToObject(withoutNot, false)
  })
  return negatedObjects.length === 1 ? negatedObjects[0] : negatedObjects
}

/** Convert a group node to a query object */
const groupToObject = (
  node: QueryNode & { type: "group" },
  isRoot: boolean,
  forArray: boolean = false
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

  // Optimization: flatten root AND children into top-level object
  // Conditions become field keys, groups become $and/$or keys — if no key conflicts
  if (isRoot && groupOperator === "and" && negatedChildren.length === 0) {
    // Single child: just unwrap it
    if (normalChildren.length === 1) {
      const result = queryNodeToObject(normalChildren[0], false)
      if (boost && boost !== 1) result.$boost = boost
      return result
    }

    const conditionChildren = normalChildren.filter((c) => c.type === "condition")
    const groupChildren = normalChildren.filter((c) => c.type === "group") as (QueryNode & {
      type: "group"
    })[]

    // Don't flatten if a group child has same operator, multiple children, and boost
    // (would create confusing nested $and inside root AND)
    const hasConflictingGroupChild = groupChildren.some(
      (c) => c.groupOperator === groupOperator && c.children.length > 1 && c.boost
    )

    if (!hasConflictingGroupChild) {
      // Check for key conflicts: duplicate fields or duplicate group operators
      const fields = conditionChildren.map(
        (c) => (c as QueryNode & { type: "condition" }).condition.field
      )
      const groupOps = groupChildren.map((c) => `$${c.groupOperator}`)
      const allKeys = [...fields, ...groupOps]
      const hasConflicts = new Set(allKeys).size !== allKeys.length

      if (!hasConflicts) {
        const result: Record<string, unknown> = {}
        for (const child of conditionChildren) {
          Object.assign(result, conditionToObject(child as QueryNode & { type: "condition" }))
        }
        for (const child of groupChildren) {
          Object.assign(result, groupToObject(child, false))
        }
        if (boost && boost !== 1) result.$boost = boost
        return result
      }
    }
  }

  // Optimization: merge all-condition children into object form
  if (normalChildren.length > 0 && canMergeChildren(normalChildren)) {
    // Root AND without negated children: flatten to top-level
    if (isRoot && groupOperator === "and" && negatedChildren.length === 0) {
      return mergeConditions(normalChildren, boost)
    }

    const result: Record<string, unknown> = {}
    if (forArray) {
      // Array context: boost goes outside as sibling of $op key
      result[`$${groupOperator}`] = mergeConditions(normalChildren)
      if (boost && boost !== 1) result.$boost = boost
    } else {
      // Standalone/merged context: boost goes inside the operator value
      result[`$${groupOperator}`] = mergeConditions(normalChildren, boost)
    }
    if (negatedChildren.length > 0) {
      result.$mustNot = buildMustNot(negatedChildren)
    }
    return result
  }

  // Standard format: $and/$or for normal children, $mustNot as sibling for negated children
  const result: Record<string, unknown> = {}

  if (normalChildren.length > 0) {
    result[`$${groupOperator}`] = normalChildren.map((child) => {
      // Same-operator group with multiple mergeable conditions: flatten to merged object
      // (avoids redundant nesting like $and: [{ $and: { ... } }] inside $and array)
      if (child.type === "group") {
        const groupChild = child as QueryNode & { type: "group" }
        const gc = groupChild.children
        const gcNormal = gc.filter((c) => !c.not)
        const gcNegated = gc.filter((c) => c.not)
        if (
          groupChild.groupOperator === groupOperator &&
          gc.length > 1 &&
          gcNegated.length === 0 &&
          canMergeChildren(gcNormal)
        ) {
          return mergeConditions(gcNormal, groupChild.boost)
        }
      }
      return queryNodeToObject(child, false, true)
    })
  } else if (negatedChildren.length > 0) {
    // Preserve empty group operator when there are negated children
    result[`$${groupOperator}`] = {}
  }

  if (negatedChildren.length > 0) {
    result.$mustNot = buildMustNot(negatedChildren)
  }

  if (boost && boost !== 1) {
    result.$boost = boost
  }

  return result
}

/** Convert a QueryNode to a raw query object */
const queryNodeToObject = (
  node: QueryNode,
  isRoot: boolean = false,
  forArray: boolean = false
): Record<string, unknown> => {
  if (node.type === "condition") {
    return conditionToObject(node as QueryNode & { type: "condition" })
  }
  if (node.type === "group") {
    return groupToObject(node as QueryNode & { type: "group" }, isRoot, forArray)
  }
  return {}
}

export const stringifyQueryState = (state: QueryState): string => {
  const obj = queryNodeToObject(state.root, true)
  return toJsLiteral(obj)
}
