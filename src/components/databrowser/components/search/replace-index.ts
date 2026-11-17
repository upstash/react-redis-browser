import type { Redis } from "@upstash/redis"

import { formatUpstashErrorMessage } from "@/lib/utils"

export type SearchClient = { search: Pick<Redis["search"], "index" | "alias"> }

type CreatedIndex = { waitIndexing: () => Promise<unknown>; drop: () => Promise<unknown> }

/** Thrown when saving fails */
export class ReplaceIndexError extends Error {
  constructor(message: string) {
    super(message)
    this.name = "ReplaceIndexError"
  }
}

const errorMessage = (error: unknown) =>
  formatUpstashErrorMessage(error instanceof Error ? error : new Error(String(error)))

const attempt = async <T>(
  run: () => Promise<T>,
  message: (error: string) => string
): Promise<T> => {
  try {
    return await run()
  } catch (error) {
    throw new ReplaceIndexError(message(errorMessage(error)))
  }
}

/** Runs `run` for every target, waiting for all of them, and returns the targets it failed for */
const failedFor = async (targets: string[], run: (target: string) => Promise<unknown>) => {
  const results = await Promise.allSettled(targets.map((target) => run(target)))
  const failed = targets.filter((_, i) => results[i].status === "rejected")
  const reason = results.find((result) => result.status === "rejected")?.reason
  return { failed, reason }
}

/**
 * Replaces an index with one created by `create`, keeping its name and aliases.
 *
 * The new index is built under a temporary name first, so a schema the server rejects leaves the
 * original untouched. While the index is re-created under its own name, aliases point its name
 * and its aliases at the temporary index, so queries keep working. This relies on an alias
 * taking precedence over an index with the same name, and on SEARCH.DROP ignoring aliases.
 */
export const replaceIndex = async (
  redis: SearchClient,
  name: string,
  create: (name: string) => Promise<CreatedIndex>,
  onStep: (step: string) => void = () => {}
) => {
  const { alias } = redis.search

  const aliases = await attempt(
    () => alias.list(),
    (error) => `Could not read the index aliases, nothing was changed: ${error}`
  )
  if (Object.hasOwn(aliases, name)) {
    throw new ReplaceIndexError(
      `"${name}" is also an alias of "${aliases[name]}", nothing was changed`
    )
  }
  const names = [name, ...Object.keys(aliases).filter((other) => aliases[other] === name)]
  let temporary: string
  do {
    temporary = `${name}-${Math.random().toString(36).slice(2, 8)}`
  } while (Object.hasOwn(aliases, temporary))

  onStep("Building the new index...")
  const built = await attempt(
    () => create(temporary),
    (error) => `Could not create the index, nothing was changed: ${error}`
  )

  const pointBack = (target: string) =>
    target === name ? alias.delete({ alias: name }) : alias.add({ indexName: name, alias: target })

  try {
    await built.waitIndexing()
    const { reason } = await failedFor(names, (target) =>
      alias.add({ indexName: temporary, alias: target })
    )
    if (reason !== undefined) throw reason
  } catch (error) {
    const { failed } = await failedFor(names, pointBack)
    const undone =
      failed.length === 0 &&
      (await built.drop().then(
        () => true,
        () => false
      ))
    throw new ReplaceIndexError(
      undone
        ? `Could not switch to the new index, nothing was changed: ${errorMessage(error)}`
        : `Could not switch to the new index: ${errorMessage(error)}. Undoing it failed too, so check the aliases of "${name}" and drop the index "${temporary}".`
    )
  }

  // From here on, queries to the index and its aliases reach the temporary index
  const servedByTemporary = (error: string) =>
    `The new schema is saved, but "${name}" is served by the temporary index "${temporary}" through an alias: ${error}`

  onStep("Re-creating the index...")
  await attempt(() => redis.search.index({ name }).drop(), servedByTemporary)
  await attempt(() => create(name), servedByTemporary)
  await attempt(() => alias.delete({ alias: name }), servedByTemporary)

  // Other aliases still reach the temporary index
  const others = names.slice(1)
  const aliasesLeft = (left: string[], error: string) =>
    left.length === 0
      ? `The new schema is saved, but dropping the temporary index "${temporary}" failed: ${error}`
      : `The new schema is saved, but the aliases ${left.map((other) => `"${other}"`).join(", ")} still point at the temporary index "${temporary}": ${error}`

  // Until the alias was deleted, waiting on the name waited on the temporary index
  await attempt(
    () => redis.search.index({ name }).waitIndexing(),
    (error) =>
      `The new schema is saved, but waiting for "${name}" to finish indexing failed, so the temporary index "${temporary}"${others.length > 0 ? " and the aliases pointing at it were" : " was"} left in place: ${error}`
  )
  const { failed, reason } = await failedFor(others, pointBack)
  if (reason !== undefined) {
    throw new ReplaceIndexError(aliasesLeft(failed, errorMessage(reason)))
  }
  await attempt(
    () => built.drop(),
    (error) => aliasesLeft([], error)
  )
}
