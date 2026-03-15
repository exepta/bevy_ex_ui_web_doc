import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { Components } from 'react-markdown'
import type { CSSProperties } from 'react'
import { PrismLight as SyntaxHighlighter } from 'react-syntax-highlighter'
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

const syntaxThemeLight: Record<string, CSSProperties> = {
  'code[class*="language-"]': {
    background: 'transparent',
    color: 'var(--text-main)',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '0.88rem',
    lineHeight: 1.62,
    textShadow: 'none',
  },
  'pre[class*="language-"]': {
    background: 'transparent',
    color: 'var(--text-main)',
    margin: 0,
    overflow: 'visible',
    padding: 0,
    textShadow: 'none',
  },
  comment: {
    color: '#6d7f98',
    fontStyle: 'italic',
  },
  punctuation: {
    color: '#60758f',
  },
  property: {
    color: '#0f63bc',
  },
  tag: {
    color: '#0f63bc',
  },
  boolean: {
    color: '#9350c9',
  },
  number: {
    color: '#9350c9',
  },
  selector: {
    color: '#1f7a52',
  },
  'attr-name': {
    color: '#1961b7',
  },
  string: {
    color: '#1f7a52',
  },
  char: {
    color: '#1f7a52',
  },
  builtin: {
    color: '#14639a',
  },
  inserted: {
    color: '#1f7a52',
  },
  operator: {
    color: '#5f6f85',
  },
  entity: {
    color: '#5f6f85',
    cursor: 'help',
  },
  url: {
    color: '#ad5b16',
  },
  atrule: {
    color: '#ad5b16',
  },
  'attr-value': {
    color: '#ad5b16',
  },
  keyword: {
    color: '#2357b5',
  },
  function: {
    color: '#2357b5',
  },
  'class-name': {
    color: '#2357b5',
  },
  regex: {
    color: '#bc6222',
  },
  important: {
    color: '#bc6222',
    fontWeight: 700,
  },
  variable: {
    color: '#5f6f85',
  },
  bold: {
    fontWeight: 700,
  },
  italic: {
    fontStyle: 'italic',
  },
}

const syntaxThemeDark: Record<string, CSSProperties> = {
  'code[class*="language-"]': {
    background: 'transparent',
    color: 'var(--text-main)',
    fontFamily: '"IBM Plex Mono", monospace',
    fontSize: '0.88rem',
    lineHeight: 1.62,
    textShadow: 'none',
  },
  'pre[class*="language-"]': {
    background: 'transparent',
    color: 'var(--text-main)',
    margin: 0,
    overflow: 'visible',
    padding: 0,
    textShadow: 'none',
  },
  comment: {
    color: '#7f93ad',
    fontStyle: 'italic',
  },
  punctuation: {
    color: '#90a5bf',
  },
  property: {
    color: '#7ab8ff',
  },
  tag: {
    color: '#7ab8ff',
  },
  boolean: {
    color: '#d9a7ff',
  },
  number: {
    color: '#d9a7ff',
  },
  selector: {
    color: '#8ce6b5',
  },
  'attr-name': {
    color: '#8dbfff',
  },
  string: {
    color: '#8ce6b5',
  },
  char: {
    color: '#8ce6b5',
  },
  builtin: {
    color: '#8bd6ff',
  },
  inserted: {
    color: '#8ce6b5',
  },
  operator: {
    color: '#a6bacf',
  },
  entity: {
    color: '#a6bacf',
    cursor: 'help',
  },
  url: {
    color: '#ffbc84',
  },
  atrule: {
    color: '#ffbc84',
  },
  'attr-value': {
    color: '#ffbc84',
  },
  keyword: {
    color: '#9cb8ff',
  },
  function: {
    color: '#9cb8ff',
  },
  'class-name': {
    color: '#9cb8ff',
  },
  regex: {
    color: '#ffc38c',
  },
  important: {
    color: '#ffc38c',
    fontWeight: 700,
  },
  variable: {
    color: '#a6bacf',
  },
  bold: {
    fontWeight: 700,
  },
  italic: {
    fontStyle: 'italic',
  },
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
    iframe: ({ className, src, loading, ...props }) => {
      const themedSrc = withThemeParam(src, theme)
      const nextClassName = className ? `${className} docs-example-frame` : 'docs-example-frame'
      return <iframe {...props} className={nextClassName} src={themedSrc} loading={loading ?? 'lazy'} />
    },
    pre: ({ ...props }) => <>{props.children}</>,
    code: ({ className, children, ...props }) => {
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
          style={theme === 'dark' ? syntaxThemeDark : syntaxThemeLight}
          className="docs-code-block"
          customStyle={{
            margin: '0.95rem 0',
            borderRadius: '12px',
            border: '1px solid color-mix(in srgb, var(--brand-main) 26%, var(--border-soft))',
            padding: '0.95rem 1rem',
            background:
              'linear-gradient(160deg, color-mix(in srgb, var(--brand-main) 12%, var(--card-alt)) 0%, var(--card-alt) 58%)',
            boxShadow: 'inset 0 1px 0 color-mix(in srgb, var(--brand-main) 24%, transparent)',
          }}
          codeTagProps={{
            style: {
              fontFamily: '"IBM Plex Mono", monospace',
              fontSize: '0.88rem',
            },
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
