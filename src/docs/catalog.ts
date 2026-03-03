const rawDocs = import.meta.glob('../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const latestVersion = '1.4.2'
const mainBranchRef = 'main'
const defaultDocsLocale = 'en_US'
const categoryOrder = ['Getting Started', 'Widgets', 'Features', 'Css-Rules', 'Html-Rules', 'How-to-guides']
const supportedDocsLocales = ['de_DE', 'en_US'] as const

export type DocsLocale = (typeof supportedDocsLocales)[number]

export type DocsSection = {
  category: string
  entries: string[]
}

type LocalizedDocs = Map<DocsLocale, Map<string, string>>

type ParsedDocs = {
  baseDocs: LocalizedDocs
  versionedDocs: Map<string, LocalizedDocs>
}

function isSupportedLocale(locale: string): locale is DocsLocale {
  return (supportedDocsLocales as readonly string[]).includes(locale)
}

function normalizeLocale(locale: string) {
  const normalized = locale.replace('-', '_')
  return isSupportedLocale(normalized) ? normalized : null
}

function ensureLocaleDocs(docs: LocalizedDocs, locale: DocsLocale) {
  const existing = docs.get(locale)
  if (existing) {
    return existing
  }

  const next = new Map<string, string>()
  docs.set(locale, next)
  return next
}

function ensureVersionedLocaleDocs(versionedDocs: Map<string, LocalizedDocs>, version: string, locale: DocsLocale) {
  if (!versionedDocs.has(version)) {
    versionedDocs.set(version, new Map<DocsLocale, Map<string, string>>())
  }

  return ensureLocaleDocs(versionedDocs.get(version) as LocalizedDocs, locale)
}

function isVersionSegment(segment: string) {
  return segment === mainBranchRef || /^\d+\.\d+\.\d+$/.test(segment)
}

type ParsedDocPath = {
  version: string | null
  locale: DocsLocale
  category: string
  entry: string
}

function parseDocPath(relative: string): ParsedDocPath | null {
  const parts = relative.split('/')
  let index = 0
  let version: string | null = null

  if (parts.length >= 3 && isVersionSegment(parts[0])) {
    version = parts[0]
    index = 1
  }

  const remaining = parts.slice(index)

  if (remaining.length === 2) {
    const [category, entry] = remaining
    return { version, locale: defaultDocsLocale, category, entry }
  }

  if (remaining.length === 3) {
    const [first, second, third] = remaining
    const localeFirst = normalizeLocale(first)
    if (localeFirst) {
      return {
        version,
        locale: localeFirst,
        category: second,
        entry: third,
      }
    }

    const localeSecond = normalizeLocale(second)
    if (localeSecond) {
      return {
        version,
        locale: localeSecond,
        category: first,
        entry: third,
      }
    }
  }

  return null
}

export function parseDocsFiles(files: Record<string, string>): ParsedDocs {
  const baseDocs = new Map<DocsLocale, Map<string, string>>()
  const versionedDocs = new Map<string, LocalizedDocs>()

  for (const [path, content] of Object.entries(files)) {
    const match = path.match(/\/docs\/(.+)\.md$/)
    if (!match) {
      continue
    }

    const relative = match[1]
    const parsedPath = parseDocPath(relative)
    if (!parsedPath) {
      continue
    }

    const docKey = `${parsedPath.category}/${parsedPath.entry}`

    if (parsedPath.version) {
      ensureVersionedLocaleDocs(versionedDocs, parsedPath.version, parsedPath.locale).set(docKey, content)
      continue
    }

    ensureLocaleDocs(baseDocs, parsedPath.locale).set(docKey, content)
  }

  return { baseDocs, versionedDocs }
}

const parsedDocs = parseDocsFiles(rawDocs)
const baseDocs = parsedDocs.baseDocs
const versionedDocs = parsedDocs.versionedDocs

function mergeLocalizedDocs(merged: Map<string, string>, localizedDocs: LocalizedDocs, locale: DocsLocale) {
  const localeDocs = localizedDocs.get(locale)
  const defaultLocaleDocs = localizedDocs.get(defaultDocsLocale)
  const docsToMerge = localeDocs && localeDocs.size > 0 ? localeDocs : defaultLocaleDocs

  if (!docsToMerge) {
    return
  }

  for (const [key, value] of docsToMerge) {
    merged.set(key, value)
  }
}

function hasLocalizedDocs(localizedDocs: LocalizedDocs | undefined, locale: DocsLocale) {
  if (!localizedDocs) {
    return false
  }

  const localeDocs = localizedDocs.get(locale)
  if (localeDocs && localeDocs.size > 0) {
    return true
  }

  const defaultLocaleDocs = localizedDocs.get(defaultDocsLocale)
  return Boolean(defaultLocaleDocs && defaultLocaleDocs.size > 0)
}

function getMergedDocs(version: string, locale: DocsLocale = defaultDocsLocale) {
  const merged = new Map<string, string>()

  if (version === latestVersion) {
    const mainDocs = versionedDocs.get(mainBranchRef)
    if (mainDocs && hasLocalizedDocs(mainDocs, locale)) {
      mergeLocalizedDocs(merged, mainDocs, locale)
      return merged
    }

    mergeLocalizedDocs(merged, baseDocs, locale)
    return merged
  }

  const versionLocaleMap = versionedDocs.get(version)
  if (versionLocaleMap) {
    mergeLocalizedDocs(merged, versionLocaleMap, locale)
  }

  return merged
}

export { latestVersion }

export function sortCategories(a: string, b: string) {
  const aIndex = categoryOrder.indexOf(a)
  const bIndex = categoryOrder.indexOf(b)
  const aRank = aIndex === -1 ? Number.MAX_SAFE_INTEGER : aIndex
  const bRank = bIndex === -1 ? Number.MAX_SAFE_INTEGER : bIndex

  if (aRank !== bRank) {
    return aRank - bRank
  }

  return a.localeCompare(b)
}

function getEntryOrderPrefix(entry: string) {
  const match = entry.match(/^(\d+)_/)
  if (!match) {
    return null
  }

  return Number.parseInt(match[1], 10)
}

export function sortEntries(a: string, b: string) {
  const aPrefix = getEntryOrderPrefix(a)
  const bPrefix = getEntryOrderPrefix(b)

  if (aPrefix !== null && bPrefix !== null && aPrefix !== bPrefix) {
    return aPrefix - bPrefix
  }

  if (aPrefix !== null && bPrefix === null) {
    return -1
  }

  if (aPrefix === null && bPrefix !== null) {
    return 1
  }

  return a.localeCompare(b)
}

export function toDocsSections(merged: Map<string, string>): DocsSection[] {
  const byCategory = new Map<string, Set<string>>()

  for (const key of merged.keys()) {
    const [category, entry] = key.split('/')
    if (!category || !entry) {
      continue
    }
    if (!byCategory.has(category)) {
      byCategory.set(category, new Set<string>())
    }
    byCategory.get(category)?.add(entry)
  }

  return [...byCategory.entries()]
    .sort((a, b) => sortCategories(a[0], b[0]))
    .map(([category, entries]) => ({
      category,
      entries: [...entries].sort((a, b) => sortEntries(a, b)),
    }))
}

export function listDocs(version: string, locale: DocsLocale = defaultDocsLocale): DocsSection[] {
  const merged = getMergedDocs(version, locale)
  return toDocsSections(merged)
}

export function getDocMarkdown(version: string, category: string, entry: string, locale: DocsLocale = defaultDocsLocale) {
  const merged = getMergedDocs(version, locale)
  return merged.get(`${category}/${entry}`) ?? null
}
