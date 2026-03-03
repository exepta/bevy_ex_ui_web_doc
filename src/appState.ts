import type { DocsSection } from './docs/catalog'

export type ActiveEntry = {
  category: string
  entry: string
}

function stripEntryPrefix(entry: string) {
  return entry.replace(/^\d+_/, '')
}

export function getDefaultEntry(docs: DocsSection[]): ActiveEntry | null {
  const gettingStarted = docs.find((section) => section.category === 'Getting Started')
  const overview = gettingStarted?.entries.find((entry) => stripEntryPrefix(entry) === 'Overview')

  if (gettingStarted && overview) {
    return { category: 'Getting Started', entry: overview }
  }

  const firstSection = docs[0]
  if (!firstSection || firstSection.entries.length === 0) {
    return null
  }

  return { category: firstSection.category, entry: firstSection.entries[0] }
}

export function createInitialExpanded(docs: DocsSection[]) {
  const expanded: Record<string, boolean> = {}
  for (const section of docs) {
    expanded[section.category] = section.category === 'Getting Started'
  }
  return expanded
}
