/**
 * Query Builder Types
 *
 * These types match the Upstash Search query structure and are used
 * by both the query parser and the UI components.
 */

// ============================================================================
// OPERATOR TYPES
// ============================================================================

export type FieldOperator = "eq" | "ne" | "gt" | "gte" | "lt" | "lte" | "in" | "contains" | "fuzzy"

export type GroupOperator = "and" | "or"

// ============================================================================
// FIELD TYPE
// ============================================================================

export type FieldType = "string" | "number" | "boolean" | "date" | "unknown"

export type FieldInfo = {
  name: string
  type: FieldType
}

// ============================================================================
// OPERATOR CONSTANTS
// ============================================================================

/** Operators supported for string fields */
export const STRING_OPERATORS: FieldOperator[] = ["eq", "ne", "in", "contains", "fuzzy"]

/** Operators supported for number fields */
export const NUMBER_OPERATORS: FieldOperator[] = ["eq", "ne", "gt", "gte", "lt", "lte", "in"]

/** Operators supported for boolean fields */
export const BOOLEAN_OPERATORS: FieldOperator[] = ["eq", "ne", "in"]

/** Operators supported for date fields */
export const DATE_OPERATORS: FieldOperator[] = ["eq", "ne", "gt", "gte", "lt", "lte", "in"]

/** All available operators */
export const ALL_OPERATORS: FieldOperator[] = [
  "eq",
  "ne",
  "gt",
  "gte",
  "lt",
  "lte",
  "in",
  "contains",
  "fuzzy",
]

/** Operator options with labels for UI display */
export const OPERATOR_OPTIONS: { value: FieldOperator; label: string }[] = [
  { value: "eq", label: "eq" },
  { value: "ne", label: "ne" },
  { value: "gt", label: "gt" },
  { value: "gte", label: "gte" },
  { value: "lt", label: "lt" },
  { value: "lte", label: "lte" },
  { value: "in", label: "in" },
  { value: "contains", label: "contains" },
  { value: "fuzzy", label: "fuzzy" },
]

/** Get the operators available for a given field type */
export const getOperatorsForFieldType = (fieldType: FieldType): FieldOperator[] => {
  switch (fieldType) {
    case "string": {
      return STRING_OPERATORS
    }
    case "number": {
      return NUMBER_OPERATORS
    }
    case "boolean": {
      return BOOLEAN_OPERATORS
    }
    case "date": {
      return DATE_OPERATORS
    }
    default: {
      // For unknown types, show all operators
      return ALL_OPERATORS
    }
  }
}

// ============================================================================
// CONDITION & NODE TYPES
// ============================================================================

export type FieldCondition = {
  operator: FieldOperator
  field: string
  value: string | number | boolean | string[]
  /** Only used when operator is "fuzzy" */
  fuzzyDistance?: 1 | 2
  /** Optional boost multiplier for relevance scoring */
  boost?: number
}

/**
 * A QueryNode represents either:
 * - A condition (leaf node with field/operator/value)
 * - A group (container with AND/OR operator and child nodes)
 */
export type QueryNode = {
  id: string
  /** When true, this node is negated ($mustNot wrapper) */
  not?: boolean
  /** Optional boost multiplier for relevance scoring (applies to both conditions and groups) */
  boost?: number
} & (
  | {
      type: "condition"
      condition: FieldCondition
    }
  | {
      type: "group"
      groupOperator: GroupOperator
      children: QueryNode[]
    }
)

// ============================================================================
// QUERY STATE
// ============================================================================

/**
 * The root query state - always starts with a group node
 */
export interface QueryState {
  root: QueryNode
}

// ============================================================================
// UTILITY
// ============================================================================

/**
 * Generate a unique ID for query nodes
 */
export const generateId = (): string => {
  return Math.random().toString(36).slice(2, 11)
}
