const rawDocs = import.meta.glob('../../docs/**/*.md', {
  query: '?raw',
  import: 'default',
  eager: true,
}) as Record<string, string>

const latestVersion = '1.4.2'
const categoryOrder = ['Getting Started', 'Widgets', 'Features', 'Css-Rules', 'Html-Rules', 'How-to-guides']

export type DocsSection = {
  category: string
  entries: string[]
}

type ParsedDocs = {
  baseDocs: Map<string, string>
  versionedDocs: Map<string, Map<string, string>>
}

export function parseDocsFiles(files: Record<string, string>): ParsedDocs {
  const baseDocs = new Map<string, string>()
  const versionedDocs = new Map<string, Map<string, string>>()

  for (const [path, content] of Object.entries(files)) {
    const match = path.match(/\/docs\/(.+)\.md$/)
    if (!match) {
      continue
    }

    const relative = match[1]
    const parts = relative.split('/')

    if (parts.length === 2) {
      const [category, entry] = parts
      baseDocs.set(`${category}/${entry}`, content)
      continue
    }

    if (parts.length === 3) {
      const [version, category, entry] = parts
      if (!versionedDocs.has(version)) {
        versionedDocs.set(version, new Map<string, string>())
      }
      versionedDocs.get(version)?.set(`${category}/${entry}`, content)
    }
  }

  return { baseDocs, versionedDocs }
}

const parsedDocs = parseDocsFiles(rawDocs)
const baseDocs = parsedDocs.baseDocs
const versionedDocs = parsedDocs.versionedDocs

function getMergedDocs(version: string) {
  const merged = new Map<string, string>()

  if (version === latestVersion) {
    for (const [key, value] of baseDocs) {
      merged.set(key, value)
    }
  }

  const versionMap = versionedDocs.get(version)

  if (versionMap) {
    for (const [key, value] of versionMap) {
      merged.set(key, value)
    }
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
      entries: [...entries].sort((a, b) => a.localeCompare(b)),
    }))
}

export function listDocs(version: string): DocsSection[] {
  const merged = getMergedDocs(version)
  return toDocsSections(merged)
}

export function getDocMarkdown(version: string, category: string, entry: string) {
  const merged = getMergedDocs(version)
  return merged.get(`${category}/${entry}`) ?? null
}
