import { describe, expect, it } from 'vitest'
import { getDocMarkdown, listDocs, parseDocsFiles, sortCategories, sortEntries, toDocsSections } from './catalog'

describe('docs catalog', () => {
  it('parses localized base/versioned files and ignores non-doc paths', () => {
    const parsed = parseDocsFiles({
      '../../docs/Getting Started/Overview.md': '# base',
      '../../docs/de_DE/Getting Started/Overview.md': '# base de prefix',
      '../../docs/Getting Started/en_US/Install.md': '# base en category locale',
      '../../docs/main/de_DE/Getting Started/Overview.md': '# main de',
      '../../docs/1.4.0/Getting Started/Overview.md': '# version',
      '../../docs/1.4.0/Getting Started/de_DE/Overview.md': '# version de',
      '../../not-docs/ignore.md': '# ignore',
    })

    expect(parsed.baseDocs.get('en_US')?.get('Getting Started/Overview')).toContain('# base')
    expect(parsed.baseDocs.get('en_US')?.get('Getting Started/Install')).toContain('# base en category locale')
    expect(parsed.baseDocs.get('de_DE')?.get('Getting Started/Overview')).toContain('# base de prefix')
    expect(parsed.versionedDocs.get('1.4.0')?.get('en_US')?.get('Getting Started/Overview')).toContain('# version')
    expect(parsed.versionedDocs.get('1.4.0')?.get('de_DE')?.get('Getting Started/Overview')).toContain('# version de')
    expect(parsed.versionedDocs.get('main')?.get('de_DE')?.get('Getting Started/Overview')).toContain('# main de')
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

  it('sorts entries by numeric prefix before alphabetical fallback', () => {
    expect(sortEntries('01_Overview', '04_Install')).toBeLessThan(0)
    expect(sortEntries('10_Examples', '2_Intro')).toBeGreaterThan(0)
    expect(sortEntries('01_Overview', 'Overview')).toBeLessThan(0)
    expect(sortEntries('Overview', 'Install')).toBeGreaterThan(0)
  })

  it('sortCategories falls back to alphabetical ordering for unknown categories', () => {
    expect(sortCategories('Widgets', 'Features')).toBeLessThan(0)
    expect(sortCategories('Zulu', 'Alpha')).toBeGreaterThan(0)
  })

  it('returns stable local fallback values when no matching local docs exist', () => {
    expect(listDocs('1.4.2')).toEqual([])
    expect(listDocs('1.4.2', 'de_DE')).toEqual([])
    expect(getDocMarkdown('1.4.0', 'Getting Started', 'Overview')).toBeNull()
  })

  it('returns empty docs for a version without markdown files', () => {
    expect(listDocs('1.3.0')).toEqual([])
    expect(getDocMarkdown('1.3.0', 'Getting Started', 'Overview')).toBeNull()
  })
})
