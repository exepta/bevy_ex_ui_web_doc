import ReactMarkdown from 'react-markdown'
import rehypeRaw from 'rehype-raw'
import remarkGfm from 'remark-gfm'
import type { ParsedMarkdownDoc } from './markdown'

type MarkdownPageProps = {
  doc: ParsedMarkdownDoc
}

function MarkdownPage({ doc }: MarkdownPageProps) {
  return (
    <article className="markdown-page">
      {doc.title ? <p className="markdown-title">{doc.title}</p> : null}
      <ReactMarkdown remarkPlugins={[remarkGfm]} rehypePlugins={[rehypeRaw]}>
        {doc.body}
      </ReactMarkdown>
    </article>
  )
}

export default MarkdownPage
