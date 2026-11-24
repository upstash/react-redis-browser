/**
 * Compares search queries by what the server runs, not by how they are spelled.
 *
 * This mirrors how the server parses a query object and lowers it into a search query
 * (redis-server search/rust/src/query.rs: parse_query_object, lower_query, lower_group,
 * lower_excluded, finish_bool). Two queries with the same meaning key run the same search.
 * The comparison only has to be sound, not complete: when in doubt, keys differ.
 *
 * Field constraints are compared as written (after the shorthand rewrite below), because
 * how a value is matched depends on the field type, which is not known here.
 */

type Occur = "must" | "should" | "mustNot"

/** A lowered query, as a canonical string, with the occur it is added with */
type Subquery = { occur: Occur; query: string }

type Clause =
  | { kind: "group"; occur: "must" | "should"; body: GroupBody }
  | { kind: "mustNot"; body: GroupBody }
  | { kind: "boost"; node: QueryNode; value: number }
  | { kind: "field"; query: string }

type QueryNode = { clauses: Clause[]; boost?: number }

type GroupBody = { list: QueryNode[] } | { object: QueryNode }

/** The query is rejected by the server */
class InvalidQueryError extends Error {}

const isPlainObject = (value: unknown): value is Record<string, unknown> =>
  typeof value === "object" && value !== null && !Array.isArray(value)

const sortKeys = (value: unknown): unknown => {
  if (Array.isArray(value)) return value.map((item) => sortKeys(item))
  if (!isPlainObject(value)) return value
  return Object.fromEntries(
    Object.keys(value)
      .sort()
      .map((key) => [key, sortKeys(value[key])])
  )
}

const GROUP_OCCURS: Record<string, "must" | "should"> = {
  $must: "must",
  $and: "must",
  $should: "should",
  $or: "should",
}

/**
 * A field constraint. The server reads { f: "x" } like { f: { $smart: "x" } } and
 * { f: 1 } like { f: { $eq: 1 } }, everything else is compared as written.
 */
const lowerField = (name: string, value: unknown): string => {
  let ops: [string, unknown][]
  let boost: number | undefined

  if (isPlainObject(value)) {
    ops = []
    for (const [op, opValue] of Object.entries(value)) {
      if (op !== "$boost") {
        ops.push([op, sortKeys(opValue)])
        continue
      }
      if (Object.keys(value).length === 1 || typeof opValue !== "number") {
        throw new InvalidQueryError()
      }
      boost = opValue
    }
  } else if (typeof value === "string") {
    ops = [["$smart", value]]
  } else if (typeof value === "number" || typeof value === "boolean") {
    ops = [["$eq", value]]
  } else {
    ops = [["", value]]
  }

  // Multiple constraints on one field are all required, so their order doesn't matter
  const sortedOps = ops.map((op) => JSON.stringify(op)).sort()
  const query = `field(${JSON.stringify(name)},[${sortedOps.join(",")}])`
  return boost === undefined ? query : `boost(${query},${boost})`
}

const parseGroup = (value: unknown): GroupBody => {
  if (Array.isArray(value)) {
    if (value.length === 0) throw new InvalidQueryError()
    return {
      list: value.map((item) => {
        if (!isPlainObject(item)) throw new InvalidQueryError()
        return parseQueryObject(item)
      }),
    }
  }
  if (isPlainObject(value)) {
    if (Object.keys(value).length === 0) throw new InvalidQueryError()
    return { object: parseQueryObject(value) }
  }
  throw new InvalidQueryError()
}

const parseQueryObject = (obj: Record<string, unknown>): QueryNode => {
  const clauses: Clause[] = []
  let boost: number | undefined
  if ("$and" in obj && "$or" in obj) throw new InvalidQueryError()

  for (const [key, value] of Object.entries(obj)) {
    if (!key.startsWith("$")) {
      clauses.push({ kind: "field", query: lowerField(key, value) })
    } else if (key in GROUP_OCCURS) {
      clauses.push({ kind: "group", occur: GROUP_OCCURS[key], body: parseGroup(value) })
    } else if (key === "$mustNot") {
      clauses.push({ kind: "mustNot", body: parseGroup(value) })
    } else if (key === "$boost") {
      if (typeof value === "number") {
        if (Object.keys(obj).length === 1) throw new InvalidQueryError()
        boost = value
      } else {
        if (!isPlainObject(value) || typeof value.value !== "number") {
          throw new InvalidQueryError()
        }
        if (!isPlainObject(value.query)) throw new InvalidQueryError()
        clauses.push({ kind: "boost", node: parseQueryObject(value.query), value: value.value })
      }
    } else {
      throw new InvalidQueryError()
    }
  }

  return { clauses, boost }
}

const hasPositive = (subqueries: Subquery[]) => subqueries.some((sub) => sub.occur !== "mustNot")

// The clauses of each boolean query key built during the current getQueryMeaning call
const booleanClauses = new Map<string, Subquery[]>()

/** The order of boolean clauses doesn't matter, so they are sorted */
const booleanQuery = (subqueries: Subquery[]) => {
  const query = `bool(${subqueries
    .map((sub) => `${sub.occur}:${sub.query}`)
    .sort()
    .join(",")})`
  booleanClauses.set(query, subqueries)
  return query
}

/**
 * Excluded clauses add no score, so boosting a boolean query with one scoring clause is
 * boosting that clause. The boost is moved onto it, so both spellings get the same key.
 */
const boostQuery = (query: string, boost: number): string => {
  const subqueries = booleanClauses.get(query)
  const scoring = subqueries?.filter((sub) => sub.occur !== "mustNot")
  if (subqueries && scoring?.length === 1) {
    return booleanQuery(
      subqueries.map((sub) =>
        sub === scoring[0] ? { ...sub, query: boostQuery(sub.query, boost) } : sub
      )
    )
  }
  return `boost(${query},${boost})`
}

const finishBool = (input: Subquery[], boost?: number): string => {
  const subqueries = input.length === 0 ? [{ occur: "must" as const, query: "all" }] : [...input]
  if (!hasPositive(subqueries)) subqueries.push({ occur: "must", query: "const0(all)" })
  // Without must clauses a boolean query needs one should clause to match, so a lone should
  // clause is a must clause
  const shoulds = subqueries.filter((sub) => sub.occur === "should")
  if (shoulds.length === 1 && !subqueries.some((sub) => sub.occur === "must")) {
    shoulds[0].occur = "must"
  }
  const query = subqueries.length === 1 ? subqueries[0].query : booleanQuery(subqueries)
  return boost === undefined ? query : boostQuery(query, boost)
}

const lowerQuery = (node: QueryNode): string =>
  finishBool(lowerRootClauses(node.clauses), node.boost)

const lowerRootClauses = (clauses: Clause[]): Subquery[] => {
  const subqueries: Subquery[] = []
  for (const clause of clauses) {
    switch (clause.kind) {
      case "mustNot": {
        lowerExcluded(clause.body, subqueries)
        break
      }
      case "group": {
        subqueries.push({ occur: clause.occur, query: lowerGroup(clause.body, clause.occur) })
        break
      }
      case "boost": {
        subqueries.push({ occur: "must", query: boostQuery(lowerQuery(clause.node), clause.value) })
        break
      }
      default: {
        subqueries.push({ occur: "must", query: clause.query })
      }
    }
  }
  return subqueries
}

/** A $mustNot object body excludes each of its clauses, unless it has a $boost */
const lowerExcluded = (body: GroupBody, subqueries: Subquery[]) => {
  if ("list" in body) {
    for (const node of body.list) subqueries.push({ occur: "mustNot", query: lowerQuery(node) })
    return
  }
  if (body.object.boost !== undefined) {
    subqueries.push({ occur: "mustNot", query: lowerGroup(body, "should") })
    return
  }
  for (const clause of body.object.clauses) {
    subqueries.push({ occur: "mustNot", query: lowerQuery({ clauses: [clause] }) })
  }
}

const lowerGroup = (body: GroupBody, occur: "must" | "should"): string => {
  if ("list" in body) {
    const subqueries: Subquery[] = []
    for (const node of body.list) {
      const clauses = lowerRootClauses(node.clauses)
      // An item with only $mustNot clauses adds them to a $must group
      if (
        occur === "must" &&
        clauses.length > 0 &&
        !hasPositive(clauses) &&
        node.boost === undefined
      ) {
        subqueries.push(...clauses)
        continue
      }
      subqueries.push({ occur, query: finishBool(clauses, node.boost) })
    }
    return finishBool(subqueries)
  }

  const subqueries: Subquery[] = []
  for (const clause of body.object.clauses) {
    switch (clause.kind) {
      case "mustNot": {
        if (occur === "must") {
          lowerExcluded(clause.body, subqueries)
          break
        }
        const excluded: Subquery[] = []
        lowerExcluded(clause.body, excluded)
        subqueries.push({ occur, query: finishBool(excluded) })
        break
      }
      case "group": {
        subqueries.push({ occur, query: lowerGroup(clause.body, clause.occur) })
        break
      }
      case "boost": {
        subqueries.push({ occur, query: boostQuery(lowerQuery(clause.node), clause.value) })
        break
      }
      default: {
        subqueries.push({ occur, query: clause.query })
      }
    }
  }
  return finishBool(subqueries, body.object.boost)
}

/**
 * A key for what the server runs for a query object, or undefined if the server rejects it.
 * Queries with the same key run the same search.
 */
export const getQueryMeaning = (query: unknown): string | undefined => {
  if (!isPlainObject(query)) return
  booleanClauses.clear()
  try {
    return lowerQuery(parseQueryObject(query))
  } catch (error) {
    if (error instanceof InvalidQueryError) return
    throw error
  }
}
