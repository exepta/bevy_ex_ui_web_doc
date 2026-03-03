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
})
