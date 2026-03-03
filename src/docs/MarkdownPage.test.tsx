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
        theme="light"
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
        theme="light"
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
        theme="light"
      />,
    )

    expect(container.querySelector('p.description')?.textContent).toBe('Rendered HTML')
  })

  it('adds current theme as query parameter to iframe src', () => {
    const { container } = render(
      <MarkdownPage
        doc={{
          body: '<iframe src="http://localhost:8080/examples/button/"></iframe>',
        }}
        theme="dark"
      />,
    )

    const iframe = container.querySelector('iframe')
    expect(iframe).not.toBeNull()
    expect(iframe?.getAttribute('src')).toContain('theme=dark')
  })
})
