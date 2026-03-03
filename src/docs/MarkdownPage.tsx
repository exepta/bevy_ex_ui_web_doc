import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
import { ghcolors, oneDark } from 'react-syntax-highlighter/dist/esm/styles/prism'
import css from 'react-syntax-highlighter/dist/esm/languages/prism/css'
import markup from 'react-syntax-highlighter/dist/esm/languages/prism/markup'
import rust from 'react-syntax-highlighter/dist/esm/languages/prism/rust'
import toml from 'react-syntax-highlighter/dist/esm/languages/prism/toml'
import type { ParsedMarkdownDoc } from './markdown'

type MarkdownPageProps = {
  doc: ParsedMarkdownDoc
  theme: 'light' | 'dark'
}

SyntaxHighlighter.registerLanguage('rust', rust)
SyntaxHighlighter.registerLanguage('html', markup)
SyntaxHighlighter.registerLanguage('xml', markup)
SyntaxHighlighter.registerLanguage('markup', markup)
SyntaxHighlighter.registerLanguage('css', css)
SyntaxHighlighter.registerLanguage('toml', toml)

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

function normalizeCodeLanguage(rawLanguage: string | undefined) {
  const language = rawLanguage?.toLowerCase()
  if (!language) {
    return undefined
  }

  if (language === 'html' || language === 'xml') {
    return 'markup'
  }

  return language
}

function MarkdownPage({ doc, theme }: MarkdownPageProps) {
  const components: Components = {
    iframe: ({ node: _node, className, src, loading, ...props }) => {
      const themedSrc = withThemeParam(src, theme)
      const nextClassName = className ? `${className} docs-example-frame` : 'docs-example-frame'
      return <iframe {...props} className={nextClassName} src={themedSrc} loading={loading ?? 'lazy'} />
    },
    pre: ({ node: _node, ...props }) => <>{props.children}</>,
    code: ({ node: _node, className, children, ...props }) => {
      const languageMatch = /language-([A-Za-z0-9_-]+)/.exec(className ?? '')
      const language = normalizeCodeLanguage(languageMatch?.[1])
      const rawCode = String(children).replace(/\n$/, '')
      const isMultiline = rawCode.includes('\n')

      if (!language || !isMultiline) {
        return (
          <code className={className} {...props}>
            {children}
          </code>
        )
      }

      return (
        <SyntaxHighlighter
          language={language}
          style={theme === 'dark' ? oneDark : ghcolors}
          customStyle={{
            margin: '0.8rem 0',
            borderRadius: '10px',
            border: '1px solid var(--border-soft)',
            padding: '0.8rem',
          }}
          wrapLongLines
        >
          {rawCode}
        </SyntaxHighlighter>
      )
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
