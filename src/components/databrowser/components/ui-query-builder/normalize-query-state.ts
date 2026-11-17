import type { FieldInfo, FieldType, QueryNode, QueryState } from "./types"

/** Normalize a value based on the expected field type */
const normalizeValue = (
  value: string | number | boolean | string[],
  fieldType: FieldType
): string | number | boolean | string[] => {
  if (fieldType === "boolean") {
    if (value === "true") return true
    if (value === "false") return false
    // The builder shows a boolean field's value as true when it isn't a boolean
    if (typeof value !== "boolean" && !Array.isArray(value)) return true
    return value
  }

  // Only boolean fields hold boolean values in the builder
  if (typeof value === "boolean") return value ? "true" : "false"

  if (fieldType === "number" && typeof value === "string" && value !== "") {
    const num = Number(value)
    if (!Number.isNaN(num)) return num
  }

  if (fieldType === "string" && typeof value === "number") {
    return String(value)
  }

  return value
}

/** Normalize all condition values in a query node tree */
const normalizeNode = (node: QueryNode, fieldInfos: FieldInfo[]): QueryNode => {
  if (node.type === "condition") {
    const fieldInfo = fieldInfos.find((f) => f.name === node.condition.field)
    const condition = { ...node.condition }

    if (fieldInfo) condition.value = normalizeValue(condition.value, fieldInfo.type)

    if (condition.phraseSlop !== undefined) {
      const num = Number(condition.phraseSlop)
      condition.phraseSlop = Number.isNaN(num) ? undefined : num
    }
    if (condition.phrasePrefix !== undefined) {
      condition.phrasePrefix = Boolean(condition.phrasePrefix)
    }

    return { ...node, condition }
  }

  if (node.type === "group") {
    return {
      ...node,
      children: node.children.map((child) => normalizeNode(child, fieldInfos)),
    }
  }

  return node
}

/**
 * Normalize query state values based on field types. Only for trees the builder wrote,
 * since it can change what a query searches for.
 */
export const normalizeQueryState = (state: QueryState, fieldInfos: FieldInfo[]): QueryState => {
  return { ...state, root: normalizeNode(state.root, fieldInfos) }
}
