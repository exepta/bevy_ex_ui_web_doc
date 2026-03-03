import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { ParsedMarkdownDoc } from './markdown'

type MarkdownPageProps = {
  doc: ParsedMarkdownDoc
  theme: 'light' | 'dark'
}

function withThemeParam(src: string | undefined, theme: 'light' | 'dark') {
  if (!src) {
    return src
  }

  try {
    const base = typeof window === 'undefined' ? 'http://localhost' : window.location.origin
    const url = new URL(src, base)
    url.searchParams.set('theme', theme)
    return url.toString()
  } catch {
    return src
  }
}

function MarkdownPage({ doc, theme }: MarkdownPageProps) {
  const components: Components = {
    iframe: ({ node: _node, className, src, loading, ...props }) => {
      const themedSrc = withThemeParam(src, theme)
      const nextClassName = className ? `${className} docs-example-frame` : 'docs-example-frame'
      return <iframe {...props} className={nextClassName} src={themedSrc} loading={loading ?? 'lazy'} />
    },
  }

  return (
    <article className="markdown-page">
      {doc.title ? <p className="markdown-title">{doc.title}</p> : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]} components={components}>
        {doc.body}
      </ReactMarkdown>
    </article>
  )
}

export default MarkdownPage
