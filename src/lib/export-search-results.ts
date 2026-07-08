import type { Redis } from "@upstash/redis"

export type ExportFormat = "csv" | "json"

const PAGE_SIZE = 1000
const SAMPLE_SIZE = 50

type IndexDataType = "string" | "hash" | "json"

type SearchDoc = { key: string; score: number; data: unknown }

// Read a single document's value the same way the app reads values elsewhere.
const readDocumentValue = async (
  redis: Redis,
  key: string,
  dataType: IndexDataType
): Promise<unknown> => {
  if (dataType === "json") return await redis.json.get(key)
  if (dataType === "hash") {
    const raw = (await redis.hgetall(key)) as unknown
    // hgetall may come back as a flat [field, value, ...] array; normalize to an object.
    return Array.isArray(raw)
      ? raw.reduce<Record<string, unknown>>((obj, value, i, arr) => {
          if (i % 2 === 0) obj[String(value)] = arr[i + 1]
          return obj
        }, {})
      : raw
  }
  return await redis.get(key)
}

export const exportSearchResults = async (opts: {
  searchRedis: Redis // non-pipelined client used for the search query
  readRedis: Redis // pipelined client used to batch the per-key value reads
  indexName: string
  filter: Record<string, unknown>
  dataType: IndexDataType
  format: ExportFormat
  signal?: AbortSignal
  onProgress?: (p: { count: number; bytes: number }) => void
}): Promise<{ content: string; count: number; bytes: number }> => {
  const { searchRedis, readRedis, indexName, filter, dataType, format, signal, onProgress } = opts

  const index = searchRedis.search.index({ name: indexName })
  const docs: SearchDoc[] = []
  let offset = 0
  let bytes = 0

  for (;;) {
    if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

    // `select: {}` -> NOCONTENT -> returns just { key, score } for each match (the proven path).
    const rows = (await index.query({
      filter,
      limit: PAGE_SIZE,
      offset,
      select: {},
    })) as { key: string; score: number }[]

    if (rows.length === 0) break

    const pageDocs = await Promise.all(
      rows.map(async ({ key, score }) => ({
        key,
        score,
        data: await readDocumentValue(readRedis, key, dataType),
      }))
    )

    docs.push(...pageDocs)
    offset += rows.length
    bytes += new Blob([JSON.stringify(pageDocs)]).size

    onProgress?.({ count: docs.length, bytes })

    if (rows.length < PAGE_SIZE) break
  }

  const content = format === "csv" ? serializeCsv(docs) : serializeJson(docs)

  // Report the actual serialized output size (the running `bytes` above is a raw
  // approximation used only for live progress and won't match the final file).
  return { content, count: docs.length, bytes: new Blob([content]).size }
}

/**
 * Cheaply estimate an export before running it: the exact total match count via a
 * COUNT query, plus a small sample of documents (with values) used to extrapolate
 * the output file size.
 */
export const estimateExport = async (opts: {
  searchRedis: Redis
  readRedis: Redis
  indexName: string
  filter: Record<string, unknown>
  dataType: IndexDataType
  signal?: AbortSignal
}): Promise<{ count: number; sampleDocs: SearchDoc[] }> => {
  const { searchRedis, readRedis, indexName, filter, dataType, signal } = opts
  const index = searchRedis.search.index({ name: indexName })

  const { count } = await index.count({ filter })

  if (signal?.aborted) throw new DOMException("Aborted", "AbortError")

  const rows = (await index.query({
    filter,
    limit: SAMPLE_SIZE,
    offset: 0,
    select: {},
  })) as { key: string; score: number }[]

  const sampleDocs = await Promise.all(
    rows.map(async ({ key, score }) => ({
      key,
      score,
      data: await readDocumentValue(readRedis, key, dataType),
    }))
  )

  return { count, sampleDocs }
}

/**
 * Extrapolate the output file size for a format from the average serialized size
 * of the sampled documents across the full result count. Rough by design.
 */
export const estimateExportBytes = (
  count: number,
  sampleDocs: SearchDoc[],
  format: ExportFormat
): number => {
  if (sampleDocs.length === 0 || count === 0) return 0
  const sampleContent = format === "csv" ? serializeCsv(sampleDocs) : serializeJson(sampleDocs)
  const perRow = new Blob([sampleContent]).size / sampleDocs.length
  return Math.round(perRow * count)
}

const serializeJson = (docs: SearchDoc[]): string => {
  const rows = docs.map((d) => ({
    key: d.key,
    ...(d.data && typeof d.data === "object"
      ? (d.data as Record<string, unknown>)
      : { value: d.data }),
  }))
  return JSON.stringify(rows, undefined, 2)
}

const flatten = (
  value: unknown,
  prefix: string,
  out: Record<string, unknown>
): Record<string, unknown> => {
  if (value && typeof value === "object" && !Array.isArray(value)) {
    for (const [k, v] of Object.entries(value as Record<string, unknown>)) {
      flatten(v, prefix ? `${prefix}.${k}` : k, out)
    }
  } else {
    out[prefix] = value
  }
  return out
}

const escapeCsvCell = (value: unknown): string => {
  let str: string
  if (value === undefined || value === null) {
    str = ""
  } else if (typeof value === "object") {
    str = JSON.stringify(value)
  } else {
    str = String(value)
  }

  if (/[\n\r",]/.test(str)) {
    return `"${str.replaceAll('"', '""')}"`
  }
  return str
}

const serializeCsv = (docs: SearchDoc[]): string => {
  const flatRows = docs.map((d) => {
    const out: Record<string, unknown> = {}
    if (d.data && typeof d.data === "object") {
      flatten(d.data, "", out)
    } else {
      out.value = d.data
    }
    return out
  })

  const dataColumns = new Set<string>()
  for (const row of flatRows) {
    for (const col of Object.keys(row)) dataColumns.add(col)
  }
  const columns = ["key", ...[...dataColumns].sort()]

  const lines: string[] = []
  lines.push(columns.map((c) => escapeCsvCell(c)).join(","))

  for (const [i, doc] of docs.entries()) {
    const row = flatRows[i]
    const cells = columns.map((col) =>
      col === "key" ? escapeCsvCell(doc.key) : escapeCsvCell(row[col])
    )
    lines.push(cells.join(","))
  }

  return lines.join("\n")
}

export const downloadTextFile = (content: string, filename: string, mimeType: string): void => {
  const blob = new Blob([content], { type: mimeType })
  const url = URL.createObjectURL(blob)
  const a = document.createElement("a")
  a.href = url
  a.download = filename
  document.body.append(a)
  a.click()
  a.remove()
  URL.revokeObjectURL(url)
}

export const buildExportFilename = (indexName: string, format: ExportFormat): string => {
  const safe = indexName.replaceAll(/[^\w.-]/g, "_")
  return `${safe}-results.${format}`
}
