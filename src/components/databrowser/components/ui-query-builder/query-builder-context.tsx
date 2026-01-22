import { createContext, useCallback, useContext, useMemo, type ReactNode } from "react"

import { createInitialQueryState } from "./query-parser"
import type { FieldInfo, QueryNode, QueryState } from "./types"

// ============================================================================
// TREE OPERATIONS
// ============================================================================

const updateNodeInTree = (
  node: QueryNode,
  nodeId: string,
  updates: Partial<QueryNode>
): QueryNode => {
  if (node.id === nodeId) {
    return { ...node, ...updates } as QueryNode
  }
  if (node.type === "group") {
    return {
      ...node,
      children: node.children.map((child) => updateNodeInTree(child, nodeId, updates)),
    }
  }
  return node
}

const deleteNodeFromTree = (node: QueryNode, nodeId: string): QueryNode | null => {
  if (node.id === nodeId) {
    return null
  }
  if (node.type === "group") {
    const newChildren = node.children
      .map((child) => deleteNodeFromTree(child, nodeId))
      .filter((n): n is QueryNode => n !== null)
    return { ...node, children: newChildren }
  }
  return node
}

const addChildToGroupInTree = (node: QueryNode, groupId: string, child: QueryNode): QueryNode => {
  if (node.id === groupId && node.type === "group") {
    return { ...node, children: [...node.children, child] }
  }
  if (node.type === "group") {
    return {
      ...node,
      children: node.children.map((c) => addChildToGroupInTree(c, groupId, child)),
    }
  }
  return node
}

const moveNodeInTree = (
  root: QueryNode,
  nodeId: string,
  newParentId: string,
  newIndex: number
): QueryNode => {
  let movedNode: QueryNode | null = null

  const removeNode = (node: QueryNode): QueryNode => {
    if (node.type === "group") {
      const newChildren: QueryNode[] = []
      for (const child of node.children) {
        if (child.id === nodeId) {
          movedNode = child
        } else {
          newChildren.push(removeNode(child))
        }
      }
      return { ...node, children: newChildren }
    }
    return node
  }

  const addNodeToParent = (node: QueryNode): QueryNode => {
    if (node.id === newParentId && node.type === "group" && movedNode) {
      const newChildren = [...node.children]
      newChildren.splice(newIndex, 0, movedNode)
      return { ...node, children: newChildren }
    }
    if (node.type === "group") {
      return {
        ...node,
        children: node.children.map((element) => addNodeToParent(element)),
      }
    }
    return node
  }

  const afterRemove = removeNode(root)
  return addNodeToParent(afterRemove)
}

// ============================================================================
// CONTEXT TYPES
// ============================================================================

type QueryBuilderUIContextValue = {
  fieldNames: string[]
  fieldInfos: FieldInfo[]
  updateNode: (nodeId: string, updates: Partial<QueryNode>) => void
  deleteNode: (nodeId: string) => void
  addChildToGroup: (groupId: string, child: QueryNode) => void
  moveNode: (nodeId: string, newParentId: string, newIndex: number) => void
}

// ============================================================================
// CONTEXT
// ============================================================================

const QueryBuilderUIContext = createContext<QueryBuilderUIContextValue | null>(null)

// ============================================================================
// PROVIDER
// ============================================================================

type QueryBuilderUIProviderProps = {
  children: ReactNode
  fieldNames: string[]
  fieldInfos?: FieldInfo[]
  setQueryState: (modifier: (state: QueryState) => QueryState) => void
}

export const QueryBuilderUIProvider = ({
  children,
  fieldNames,
  fieldInfos,
  setQueryState,
}: QueryBuilderUIProviderProps) => {
  const updateNode = useCallback(
    (nodeId: string, updates: Partial<QueryNode>) => {
      setQueryState((state) => ({
        ...state,
        root: updateNodeInTree(state.root, nodeId, updates),
      }))
    },
    [setQueryState]
  )

  const deleteNode = useCallback(
    (nodeId: string) => {
      setQueryState((state) => {
        const newRoot = deleteNodeFromTree(state.root, nodeId)
        return {
          ...state,
          root: newRoot || createInitialQueryState().root,
        }
      })
    },
    [setQueryState]
  )

  const addChildToGroup = useCallback(
    (groupId: string, child: QueryNode) => {
      setQueryState((state) => ({
        ...state,
        root: addChildToGroupInTree(state.root, groupId, child),
      }))
    },
    [setQueryState]
  )

  const moveNode = useCallback(
    (nodeId: string, newParentId: string, newIndex: number) => {
      setQueryState((state) => ({
        ...state,
        root: moveNodeInTree(state.root, nodeId, newParentId, newIndex),
      }))
    },
    [setQueryState]
  )

  const value = useMemo(
    () => ({
      fieldNames,
      fieldInfos: fieldInfos ?? [],
      updateNode,
      deleteNode,
      addChildToGroup,
      moveNode,
    }),
    [fieldNames, fieldInfos, updateNode, deleteNode, addChildToGroup, moveNode]
  )

  return <QueryBuilderUIContext.Provider value={value}>{children}</QueryBuilderUIContext.Provider>
}

// ============================================================================
// HOOK
// ============================================================================

export const useQueryBuilderUI = (): QueryBuilderUIContextValue => {
  const context = useContext(QueryBuilderUIContext)
  if (!context) {
    throw new Error("useQueryBuilderUI must be used within a QueryBuilderUIProvider")
  }
  return context
}
