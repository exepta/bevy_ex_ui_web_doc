import { describe, expect, it } from 'vitest'
import { parseMarkdownDoc } from './markdown'

describe('markdown parser', () => {
  it('parses frontmatter title and info block', () => {
    const parsed = parseMarkdownDoc(`---\ntitle: Overview\n---\n\n# Headline\n\n:::info\nhello\n:::`)
    expect(parsed.title).toBe('Overview')
    expect(parsed.body).toContain('> **Info**')
  })

  it('keeps markdown without frontmatter unchanged', () => {
    const parsed = parseMarkdownDoc('# Just text')
    expect(parsed.title).toBeUndefined()
    expect(parsed.body).toBe('# Just text')
  })

  it('replaces {base.url} placeholders in markdown body', () => {
    const parsed = parseMarkdownDoc('[Button]({base.url}/examples/button)', 'http://localhost:8080')
    expect(parsed.body).toContain('http://localhost:8080/examples/button/')
    expect(parsed.body).not.toContain('{base.url}')
  })

  it('normalizes iframe example src to trailing slash', () => {
    const parsed = parseMarkdownDoc('<iframe src="{base.url}/examples/button"></iframe>', 'http://localhost:5173')
    expect(parsed.body).toContain('http://localhost:5173/examples/button/')
  })
})
