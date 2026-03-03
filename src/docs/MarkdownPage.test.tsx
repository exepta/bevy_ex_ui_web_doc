import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import MarkdownPage from './MarkdownPage'

describe('MarkdownPage', () => {
  it('renders title metadata when available', () => {
    render(
      <MarkdownPage
        doc={{
          title: 'Overview',
          body: '# Hello',
        }}
      />,
    )

    expect(screen.getByText('Overview')).toHaveClass('markdown-title')
    expect(screen.getByRole('heading', { level: 1, name: 'Hello' })).toBeInTheDocument()
  })

  it('does not render title metadata when it is missing', () => {
    const { container } = render(
      <MarkdownPage
        doc={{
          body: '# Hello',
        }}
      />,
    )

    expect(container.querySelector('.markdown-title')).toBeNull()
  })

  it('renders inline HTML from markdown body', () => {
    const { container } = render(
      <MarkdownPage
        doc={{
          body: '<p class="description">Rendered HTML</p>',
        }}
      />,
    )

    expect(container.querySelector('p.description')?.textContent).toBe('Rendered HTML')
  })
})
