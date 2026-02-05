import { useEffect, useState } from "react"
import { IconGripVertical, IconX } from "@tabler/icons-react"

import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select"
import { SimpleTooltip } from "@/components/ui/tooltip"

import { BoostBadge, NodeActionsMenu } from "./condition-common"
import { useQueryBuilderUI } from "./query-builder-context"
import {
  getOperatorsForFieldType,
  OPERATOR_OPTIONS,
  type FieldOperator,
  type QueryNode,
} from "./types"

type QueryConditionProps = {
  node: QueryNode & { type: "condition" }
  isDragging?: boolean
  /** Props for the drag handle - passed by DraggableItem */
  dragHandleProps?: {
    ref: React.Ref<HTMLElement>
    listeners: Record<string, unknown>
    attributes: Record<string, unknown>
  }
}

// Format condition value for display
const formatValueForDisplay = (value: string | number | boolean | string[]): string => {
  if (Array.isArray(value)) {
    return value.join(", ")
  }
  if (typeof value === "boolean") {
    return value ? "true" : "false"
  }
  return String(value)
}

export const QueryCondition = ({
  node,
  isDragging = false,
  dragHandleProps,
}: QueryConditionProps) => {
  const { fieldInfos, updateNode, deleteNode } = useQueryBuilderUI()

  const { condition } = node

  const fieldNames = fieldInfos.map((f) => f.name)

  // Local state for the value input to allow free editing without immediate parsing
  const [localValue, setLocalValue] = useState<string>(() => formatValueForDisplay(condition.value))
  const [isValueFocused, setIsValueFocused] = useState(false)

  // Sync local value when condition.value changes externally (and input is not focused)
  const formattedConditionValue = formatValueForDisplay(condition.value)
  if (!isValueFocused && localValue !== formattedConditionValue) {
    setLocalValue(formattedConditionValue)
  }

  // Get the current field's type for operator filtering
  const currentFieldInfo = fieldInfos.find((f) => f.name === condition.field)
  const currentFieldType = currentFieldInfo?.type ?? "unknown"

  // Check if the current field is unknown (not in schema)
  const isUnknownField = condition.field && !fieldNames.includes(condition.field)

  // Check if value type matches the field type
  const getValueTypeError = (): string | undefined => {
    if (isUnknownField || currentFieldType === "unknown" || currentFieldType === "string") {
      return undefined
    }

    const value = condition.value

    if (currentFieldType === "number") {
      if (Array.isArray(value)) {
        // For 'in' operator with number field, check if all values are valid numbers
        const invalidValues = value.filter((v) => {
          const num = Number(v)
          return Number.isNaN(num) || v === ""
        })
        if (invalidValues.length > 0) {
          return `Invalid number value${invalidValues.length > 1 ? "s" : ""}: ${invalidValues.join(", ")}`
        }
      } else if (typeof value === "string" && value !== "") {
        const num = Number(value)
        if (Number.isNaN(num)) {
          return `"${value}" is not a valid number`
        }
      }
    }

    return undefined
  }

  const valueTypeError = getValueTypeError()

  // Normalize values based on field type changes
  useEffect(() => {
    if (currentFieldType === "boolean") {
      // Convert string "true"/"false" to actual booleans
      if (condition.value === "true") {
        updateNode(node.id, {
          ...node,
          condition: { ...condition, value: true },
        })
        return
      }
      if (condition.value === "false") {
        updateNode(node.id, {
          ...node,
          condition: { ...condition, value: false },
        })
        return
      }
      // If the value is not a valid boolean at all, set it to true
      if (condition.value !== true && condition.value !== false) {
        updateNode(node.id, {
          ...node,
          condition: { ...condition, value: true },
        })
      }
    } else {
      // If the field is NOT boolean but the value is still a boolean, convert it to string
      if (typeof condition.value === "boolean") {
        updateNode(node.id, {
          ...node,
          condition: { ...condition, value: condition.value ? "true" : "false" },
        })
      }
    }
  }, [currentFieldType, condition.value])

  const handleFieldChange = (value: string) => {
    // Get the new field's type
    const newFieldInfo = fieldInfos?.find((f) => f.name === value)
    const newFieldType = newFieldInfo?.type ?? "unknown"

    // Check if current operator is valid for the new field type
    const validOperators = getOperatorsForFieldType(newFieldType)
    const isOperatorValid = validOperators.includes(condition.operator)

    // Reset value when field type changes
    let newValue: string | number | boolean | string[] = condition.value

    // If the type is changing, reset the value
    if (currentFieldType !== newFieldType) {
      if (newFieldType === "boolean") {
        // Default to true for boolean fields
        newValue = true
      } else if (newFieldType === "number") {
        // Default to 0 for number fields
        newValue = 0
      } else {
        // Default to empty string for other types
        newValue = ""
      }
    }

    updateNode(node.id, {
      ...node,
      condition: {
        ...condition,
        field: value,
        value: newValue,
        // Reset to 'eq' if current operator is not valid for the new field type
        ...(isOperatorValid ? {} : { operator: "eq" as FieldOperator }),
      },
    })
  }

  const handleOperatorChange = (value: FieldOperator) => {
    const updates: Partial<typeof condition> = { operator: value }

    // Handle fuzzy operator special case
    if (value === "fuzzy" && !condition.fuzzyDistance) {
      updates.fuzzyDistance = 1
    } else if (value !== "fuzzy") {
      updates.fuzzyDistance = undefined
    }

    // Handle phrase operator special case
    if (value !== "phrase") {
      updates.phraseSlop = undefined
      updates.phrasePrefix = undefined
    }

    // Handle in operator - convert value to array
    if (value === "in" && !Array.isArray(condition.value)) {
      if (currentFieldType === "boolean") {
        updates.value = [String(condition.value)]
      } else {
        updates.value = condition.value ? [String(condition.value)] : []
      }
    } else if (value !== "in" && Array.isArray(condition.value)) {
      updates.value =
        currentFieldType === "boolean"
          ? Boolean(condition.value.includes("true"))
          : condition.value[0] || ""
    }

    updateNode(node.id, {
      ...node,
      condition: { ...condition, ...updates },
    })
  }

  // Parse and commit the value to the parent state
  const commitValue = (value: string) => {
    let parsedValue: string | number | string[] = value

    if (currentFieldType === "number") {
      const numValue = Number(value)
      if (!Number.isNaN(numValue) && value !== "") {
        parsedValue = numValue
      }
    }

    // Handle in operator - parse as comma-separated array, filtering out empty strings
    if (condition.operator === "in") {
      parsedValue = value
        .split(",")
        .map((v) => v.trim())
        .filter((v) => v !== "")
    }

    updateNode(node.id, {
      ...node,
      condition: { ...condition, value: parsedValue },
    })
  }

  const handleValueChange = (value: string) => {
    setLocalValue(value)
    commitValue(value) // Commit immediately so changes are visible
  }

  const handleValueBlur = () => {
    setIsValueFocused(false)
  }

  const handleValueFocus = () => {
    setIsValueFocused(true)
  }

  const handleFuzzyDistanceChange = (value: string) => {
    const distance = Number(value) as 1 | 2
    updateNode(node.id, {
      ...node,
      condition: { ...condition, fuzzyDistance: distance },
    })
  }

  const phraseMode = condition.phrasePrefix
    ? "prefix"
    : condition.phraseSlop === undefined
      ? "exact"
      : "slop"

  const handlePhraseModeChange = (mode: string) => {
    const updates: Partial<typeof condition> = {}
    switch (mode) {
      case "exact": {
        updates.phraseSlop = undefined
        updates.phrasePrefix = undefined
        break
      }
      case "slop": {
        updates.phraseSlop = condition.phraseSlop ?? 1
        updates.phrasePrefix = undefined
        break
      }
      case "prefix": {
        updates.phraseSlop = undefined
        updates.phrasePrefix = true
        break
      }
      // No default
    }
    updateNode(node.id, {
      ...node,
      condition: { ...condition, ...updates },
    })
  }

  const [localSlop, setLocalSlop] = useState(String(condition.phraseSlop ?? 1))
  const [isSlopFocused, setIsSlopFocused] = useState(false)

  // Sync local slop when it changes externally (and input is not focused)
  const slopStr = String(condition.phraseSlop ?? 1)
  if (!isSlopFocused && localSlop !== slopStr) {
    setLocalSlop(slopStr)
  }

  const handlePhraseSlopChange = (value: string) => {
    setLocalSlop(value)
    const slop = Number(value)
    if (!Number.isNaN(slop) && value !== "" && slop >= 0) {
      updateNode(node.id, {
        ...node,
        condition: { ...condition, phraseSlop: slop },
      })
    }
  }

  const handlePhraseSlopBlur = () => {
    setIsSlopFocused(false)
    const slop = Number(localSlop)
    if (Number.isNaN(slop) || localSlop === "") {
      setLocalSlop(String(condition.phraseSlop ?? 1))
    }
  }

  const handleDelete = () => {
    deleteNode(node.id)
  }

  const allowedOperators = getOperatorsForFieldType(currentFieldType)
  const filteredOperators = OPERATOR_OPTIONS.filter((op) => allowedOperators.includes(op.value))

  // Check if the current operator is invalid for the field type
  const isInvalidOperator =
    !isUnknownField &&
    currentFieldType !== "unknown" &&
    !allowedOperators.includes(condition.operator)
  const operatorError = isInvalidOperator
    ? `"${condition.operator}" is not valid for ${currentFieldType} fields`
    : undefined

  return (
    <div className="group/condition flex items-center gap-1 px-1">
      {/* Drag handle - only this element can initiate dragging */}
      <div
        ref={dragHandleProps?.ref as React.Ref<HTMLDivElement>}
        className="flex cursor-grab items-center px-1 text-zinc-400 hover:text-zinc-600"
        {...(dragHandleProps?.attributes as React.HTMLAttributes<HTMLDivElement>)}
        {...(dragHandleProps?.listeners as React.HTMLAttributes<HTMLDivElement>)}
      >
        <IconGripVertical size={16} />
      </div>

      {/* Field / Operator / Value - joined group */}
      <div className="flex">
        {/* Field selector */}
        <Select value={condition.field} onValueChange={handleFieldChange}>
          <SimpleTooltip
            content={isUnknownField ? "This field is not defined in the schema" : undefined}
            variant="error"
          >
            <SelectTrigger
              className={`h-[26px] w-32 gap-3 rounded-none rounded-l-md border-r-0 border-zinc-200 bg-white px-2 text-sm font-normal ${
                isUnknownField ? "text-red-500" : ""
              }`}
            >
              <SelectValue placeholder="Select field" />
            </SelectTrigger>
          </SimpleTooltip>
          <SelectContent>
            {/* Show unknown field first if it exists */}
            {isUnknownField && (
              <SelectItem key={condition.field} value={condition.field} className="text-red-500">
                {condition.field}
              </SelectItem>
            )}
            {fieldNames.length > 0
              ? fieldNames.map((field) => (
                  <SelectItem key={field} value={field}>
                    {field}
                  </SelectItem>
                ))
              : !isUnknownField && (
                  <div className="px-2 py-1.5 text-sm text-zinc-500">No fields available</div>
                )}
          </SelectContent>
        </Select>

        {/* Operator selector - filtered by field type */}
        <Select value={condition.operator} onValueChange={handleOperatorChange}>
          <SimpleTooltip content={operatorError || valueTypeError} variant="error">
            <SelectTrigger
              className={`h-[26px] w-24 gap-3 rounded-none border-r-0 border-zinc-200 px-2 text-sm font-normal ${
                operatorError || valueTypeError ? "text-red-500" : ""
              }`}
            >
              <SelectValue />
            </SelectTrigger>
          </SimpleTooltip>
          <SelectContent>
            {/* Show invalid operator first if it exists */}
            {isInvalidOperator && (
              <SelectItem
                key={condition.operator}
                value={condition.operator}
                className="text-red-500"
              >
                {condition.operator}
              </SelectItem>
            )}
            {filteredOperators.map((op) => (
              <SelectItem key={op.value} value={op.value}>
                {op.label}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>

        {/* Value input - select for boolean fields, text input for others */}
        {currentFieldType === "boolean" && condition.operator === "in" ? (
          <div className="flex h-[26px] items-center gap-2 rounded-none rounded-r-md border border-zinc-200 bg-white px-2 text-sm">
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={Array.isArray(condition.value) && condition.value.includes("true")}
                onChange={(e) => {
                  const current = Array.isArray(condition.value) ? condition.value : []
                  const next = e.target.checked
                    ? [...current.filter((v) => v !== "true"), "true"]
                    : current.filter((v) => v !== "true")
                  updateNode(node.id, {
                    ...node,
                    condition: { ...condition, value: next },
                  })
                }}
                className="h-3 w-3"
              />
              <span>true</span>
            </label>
            <label className="flex items-center gap-1">
              <input
                type="checkbox"
                checked={Array.isArray(condition.value) && condition.value.includes("false")}
                onChange={(e) => {
                  const current = Array.isArray(condition.value) ? condition.value : []
                  const next = e.target.checked
                    ? [...current.filter((v) => v !== "false"), "false"]
                    : current.filter((v) => v !== "false")
                  updateNode(node.id, {
                    ...node,
                    condition: { ...condition, value: next },
                  })
                }}
                className="h-3 w-3"
              />
              <span>false</span>
            </label>
          </div>
        ) : currentFieldType === "boolean" ? (
          <Select
            value={
              condition.value === true || condition.value === "true"
                ? "true"
                : condition.value === false || condition.value === "false"
                  ? "false"
                  : "true" // Default to "true" if value is invalid
            }
            onValueChange={(value) => {
              const boolValue = value === "true"
              updateNode(node.id, {
                ...node,
                condition: { ...condition, value: boolValue },
              })
            }}
          >
            <SelectTrigger className="h-[26px] w-20 gap-3 rounded-none rounded-r-md border border-zinc-200 bg-white px-2 text-sm font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="true">true</SelectItem>
              <SelectItem value="false">false</SelectItem>
            </SelectContent>
          </Select>
        ) : (
          <input
            type="text"
            value={localValue}
            onChange={(e) => handleValueChange(e.target.value)}
            onBlur={handleValueBlur}
            onFocus={handleValueFocus}
            placeholder={condition.operator === "in" ? "value1, value2, ..." : "value"}
            className={`h-[26px] min-w-0 flex-1 rounded-none rounded-r-md border border-zinc-200 bg-white px-2 text-sm transition-colors focus:border-zinc-400 focus:outline-none ${
              valueTypeError ? "text-red-500" : ""
            }`}
          />
        )}
      </div>

      {/* Fuzzy distance selector */}
      {condition.operator === "fuzzy" && (
        <Select
          value={String(condition.fuzzyDistance || 1)}
          onValueChange={handleFuzzyDistanceChange}
        >
          <SelectTrigger className="h-[26px] w-16 gap-3 border-zinc-200 bg-white px-2 text-sm">
            <SelectValue />
          </SelectTrigger>
          <SelectContent>
            <SelectItem value="1">1</SelectItem>
            <SelectItem value="2">2</SelectItem>
          </SelectContent>
        </Select>
      )}

      {/* Phrase options selector */}
      {condition.operator === "phrase" && (
        <>
          <Select value={phraseMode} onValueChange={handlePhraseModeChange}>
            <SelectTrigger className="h-[26px] w-20 gap-3 border-zinc-200 bg-white px-2 text-sm font-normal">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="exact">exact</SelectItem>
              <SelectItem value="slop">slop</SelectItem>
              <SelectItem value="prefix">prefix</SelectItem>
            </SelectContent>
          </Select>
          {phraseMode === "slop" && (
            <input
              type="number"
              min={0}
              value={localSlop}
              onChange={(e) => handlePhraseSlopChange(e.target.value)}
              onFocus={() => setIsSlopFocused(true)}
              onBlur={handlePhraseSlopBlur}
              className="h-[26px] w-10 appearance-none rounded-md border border-zinc-200 bg-white px-2 text-sm focus:border-zinc-400 focus:outline-none [&::-webkit-inner-spin-button]:appearance-none [&::-webkit-outer-spin-button]:appearance-none"
            />
          )}
        </>
      )}

      {node.boost !== undefined && <BoostBadge node={node} />}

      {/* Actions */}
      <div
        className={`flex items-center gap-1 transition-all duration-100 ${
          isDragging
            ? "opacity-0"
            : "-translate-x-[2px] opacity-0 group-hover/condition:translate-x-0 group-hover/condition:opacity-100 has-[[data-state=open]]:translate-x-0 has-[[data-state=open]]:opacity-100"
        }`}
      >
        <NodeActionsMenu node={node} />

        <button
          type="button"
          onClick={handleDelete}
          className="flex h-[26px] w-[26px] items-center justify-center rounded-md border border-zinc-300 text-zinc-500 transition-colors hover:text-red-500"
        >
          <IconX size={16} />
        </button>
      </div>
    </div>
  )
}
