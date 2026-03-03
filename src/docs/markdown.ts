export type ParsedMarkdownDoc = {
  title?: string
  body: string
}

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

export function parseMarkdownDoc(source: string) {
  const parsed = parseFrontmatter(source)
  return {
    title: parsed.title,
    body: normalizeInfoBlocks(parsed.body),
  }
}
