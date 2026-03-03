import { describe, expect, it } from 'vitest'
import { getDocMarkdown, listDocs, parseDocsFiles, sortCategories, toDocsSections } from './catalog'

describe('docs catalog', () => {
  it('parses base and versioned files and ignores non-doc paths', () => {
    const parsed = parseDocsFiles({
      '../../docs/Getting Started/Overview.md': '# base',
      '../../docs/1.4.0/Getting Started/Overview.md': '# version',
      '../../not-docs/ignore.md': '# ignore',
    })

    expect(parsed.baseDocs.get('Getting Started/Overview')).toContain('# base')
    expect(parsed.versionedDocs.get('1.4.0')?.get('Getting Started/Overview')).toContain('# version')
    expect(parsed.baseDocs.size).toBe(1)
  })

  it('sorts categories by rank and entries alphabetically', () => {
    const merged = new Map<string, string>([
      ['Features/Zeta', '# zeta'],
      ['Features/Alpha', '# alpha'],
      ['Unknown/Beta', '# beta'],
      ['BrokenOnly', '# broken'],
    ])

    const sections = toDocsSections(merged)
    expect(sections[0]).toEqual({
      category: 'Features',
      entries: ['Alpha', 'Zeta'],
    })
    expect(sections[1]).toEqual({
      category: 'Unknown',
      entries: ['Beta'],
    })
  })

  it('sortCategories falls back to alphabetical ordering for unknown categories', () => {
    expect(sortCategories('Widgets', 'Features')).toBeLessThan(0)
    expect(sortCategories('Zulu', 'Alpha')).toBeGreaterThan(0)
  })

  it('lists base docs for latest version', () => {
    const docs = listDocs('1.4.2')
    const gettingStarted = docs.find((section) => section.category === 'Getting Started')
    expect(gettingStarted?.entries).toContain('Overview')
  })

  it('prefers version-specific docs when available', () => {
    const doc = getDocMarkdown('1.4.0', 'Getting Started', 'Overview')
    expect(doc).toContain('v1.4.0')
  })

  it('returns empty docs for a version without markdown files', () => {
    expect(listDocs('1.3.0')).toEqual([])
    expect(getDocMarkdown('1.3.0', 'Getting Started', 'Overview')).toBeNull()
  })
})
