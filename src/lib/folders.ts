import type { DataType } from "@/types"

export const DEFAULT_FOLDER_DELIMITER = ":"

// SCAN ... WITHCOUNT stops counting a folder at this many keys.
export const FOLDER_COUNT_LIMIT = 100

export type FolderCount = {
  n: number
  /** The folder has at least `n` keys, the server stopped counting */
  atLeast: boolean
}

export type KeyListEntry =
  | { kind: "key"; key: string; type: DataType; score?: number }
  | { kind: "folder"; key: string; count: FolderCount }

/**
 * Escapes glob characters so a literal string can be used as a SCAN MATCH prefix.
 */
export const escapeGlob = (value: string) => value.replaceAll(/[*?[\\\]]/g, String.raw`\$&`)

/**
 * The SCAN MATCH pattern for a search inside a folder. `query` is the search box
 * pattern, which already ends with `*` unless the user typed their own glob.
 */
export const getFolderMatch = (folder: string, query: string) =>
  `${escapeGlob(folder)}${query || "*"}`

/**
 * Whether a search box pattern only narrows the open folder by a prefix, like "ses*".
 * Other globs can match keys deep inside folders whose own names do not match.
 */
export const isPrefixSearch = (query: string) =>
  query === "" || (query.endsWith("*") && !/[*?[\\]/.test(query.slice(0, -1)))

// Folder pages are kept this long, so going back to a folder does not scan it again
export const FOLDER_KEYS_STALE_TIME_MS = 30 * 1000

/**
 * The key list query for the folder view, or undefined for the flat list.
 *
 * A prefix search finds out about folder support from its own scan, so it starts before
 * support is known. Other searches never send DELIMITER and wait until support is known,
 * to avoid scanning twice on servers without it.
 */
export const getFolderQuery = ({
  wantsFolders,
  supported,
  folder,
  delimiter,
  search,
}: {
  wantsFolders: boolean
  supported: boolean | undefined
  folder: string
  delimiter: string
  search: string
}) => {
  const usable = isPrefixSearch(search) ? supported !== false : supported === true
  return wantsFolders && usable ? { folder, delimiter } : undefined
}

/** Only the folder view keeps its pages, the flat list refetches as before. */
export const getKeysStaleTime = (folderQuery?: object) =>
  folderQuery ? FOLDER_KEYS_STALE_TIME_MS : 0

/**
 * Parses a WITHCOUNT count, which is exact like "5" or a lower bound like "100+".
 */
export const parseFolderCount = (value: unknown): FolderCount => {
  const text = String(value).trim()
  const atLeast = text.endsWith("+")
  const n = Number.parseInt(atLeast ? text.slice(0, -1) : text, 10)
  return { n: Number.isFinite(n) ? n : 0, atLeast }
}

/**
 * Parses the flat `[key, type, count, ...]` array that `SCAN ... DELIMITER d WITHCOUNT`
 * returns. Folders have the type "folder", everything else is a key.
 */
export const parseFolderScan = (values: unknown[]): KeyListEntry[] => {
  const entries: KeyListEntry[] = []

  for (let i = 0; i + 2 < values.length; i += 3) {
    const key = String(values[i])
    const type = String(values[i + 1])

    if (type === "folder") {
      entries.push({ kind: "folder", key, count: parseFolderCount(values[i + 2]) })
    } else {
      entries.push({ kind: "key", key, type: type as DataType })
    }
  }

  return entries
}

/**
 * Servers without folder support (open source Redis, older Upstash versions) reject
 * the DELIMITER option of SCAN with a syntax error. Only the message before the echoed
 * command is checked, since the command holds user data like folder names.
 */
export const isFolderScanUnsupported = (error: unknown) =>
  error instanceof Error && /\bsyntax error\b/i.test(error.message.split(", command was:")[0])

/** Formats a folder count for its badge, large counts show as "99+". */
export const formatFolderCount = ({ n, atLeast }: FolderCount) =>
  n >= FOLDER_COUNT_LIMIT ? `${FOLDER_COUNT_LIMIT - 1}+` : atLeast ? `${n}+` : String(n)

export type FolderCrumb = {
  /** The segment name without the delimiter */
  name: string
  /** The full folder prefix up to and including this segment */
  folder: string
}

/**
 * Splits a folder prefix like `user:1:sessions:` into its path segments.
 */
export const getFolderCrumbs = (folder: string, delimiter: string): FolderCrumb[] => {
  if (!folder || !delimiter) return []

  const crumbs: FolderCrumb[] = []
  let start = 0

  while (start < folder.length) {
    const index = folder.indexOf(delimiter, start)
    const nameEnd = index === -1 ? folder.length : index
    const end = index === -1 ? folder.length : index + delimiter.length

    crumbs.push({ name: folder.slice(start, nameEnd), folder: folder.slice(0, end) })
    start = end
  }

  return crumbs
}

/**
 * Picks which parent crumbs to show when at most `max` fit. The first parent is kept
 * when there is room for it and the rest are folded into a menu, closest parents last.
 */
export const collapseCrumbs = (
  parents: FolderCrumb[],
  max: number
): { visible: (FolderCrumb | "hidden")[]; hidden: FolderCrumb[] } => {
  if (parents.length <= max) return { visible: parents, hidden: [] }
  if (max <= 0) return { visible: ["hidden"], hidden: parents }

  const tail = max === 1 ? parents.slice(-1) : parents.slice(-(max - 1))
  const head = max === 1 ? [] : parents.slice(0, 1)
  return {
    visible: [...head, "hidden", ...tail],
    hidden: parents.slice(head.length, parents.length - tail.length),
  }
}

/** The folder one level above, or "" for the root. */
export const getParentFolder = (folder: string, delimiter: string) =>
  getFolderCrumbs(folder, delimiter).at(-2)?.folder ?? ""

/**
 * Splits a list entry into the name shown relative to the open folder. `path` holds
 * any leading segments, for example `1:` in `1:items` for a folder with a single key.
 */
export const getEntryLabel = (
  entry: KeyListEntry,
  folder: string,
  delimiter: string
): { path: string; name: string } => {
  let relative = entry.key.startsWith(folder) ? entry.key.slice(folder.length) : entry.key

  if (entry.kind === "folder" && delimiter && relative.endsWith(delimiter)) {
    relative = relative.slice(0, -delimiter.length)
  }

  const index = delimiter ? relative.lastIndexOf(delimiter) : -1
  if (index === -1) return { path: "", name: relative }

  const nameStart = index + delimiter.length
  return { path: relative.slice(0, nameStart), name: relative.slice(nameStart) }
}
