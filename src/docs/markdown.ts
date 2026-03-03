export type ParsedMarkdownDoc = {
  title?: string
  body: string
}

const baseUrlPlaceholderPattern = /\{base\.url\}/gi

function parseFrontmatter(source: string): ParsedMarkdownDoc {
  if (!source.startsWith('---\n')) {
    return { body: source }
  }

  const endIndex = source.indexOf('\n---\n', 4)
  if (endIndex === -1) {
    return { body: source }
  }

  const frontmatter = source.slice(4, endIndex)
  const body = source.slice(endIndex + 5)
  const titleMatch = frontmatter.match(/^title:\s*(.+)$/m)
  const title = titleMatch?.[1]?.trim()

  return { title, body }
}

function normalizeInfoBlocks(source: string) {
  return source.replace(/:::info\s*\n([\s\S]*?)\n:::/g, (_, content: string) => {
    const lines = content
      .trim()
      .split('\n')
      .map((line) => `> ${line}`)
      .join('\n')
    return `> **Info**\n${lines}`
  })
}

function replaceBaseUrlPlaceholder(source: string, baseUrl?: string) {
  if (!baseUrl) {
    return source
  }

  const normalizedBaseUrl = baseUrl.replace(/\/$/, '')
  const withBaseUrl = source.replace(baseUrlPlaceholderPattern, normalizedBaseUrl)
  return withBaseUrl.replace(/((?:https?:\/\/[^\s"'()<>]+)?\/examples\/[A-Za-z0-9_-]+)(?=["')\s])/g, '$1/')
}

export function parseMarkdownDoc(source: string, baseUrl?: string) {
  const parsed = parseFrontmatter(replaceBaseUrlPlaceholder(source, baseUrl))
  return {
    title: parsed.title,
    body: normalizeInfoBlocks(parsed.body),
  }
}
