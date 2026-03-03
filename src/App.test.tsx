import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('renders grouped categories and shows content for selected sub-items', async () => {
    render(<App />)

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'))
    fireEvent.click(screen.getByRole('button', { name: 'Switch to light mode' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'light'))

    const languageToggle = screen.getByRole('button', { name: 'Language' })
    expect(languageToggle).toHaveAttribute('aria-expanded', 'false')
    fireEvent.click(languageToggle)
    expect(languageToggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deutsch' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sprache' })).toBeInTheDocument())
    expect(screen.getByRole('heading', { level: 1, name: 'Übersicht' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Sprache' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Englisch (US)' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument())

    const gettingStartedToggle = screen.getByRole('button', { name: /^Getting Started$/ })
    const widgetsToggle = screen.getByRole('button', { name: /^Widgets$/ })
    const featuresToggle = screen.getByRole('button', { name: /^Features$/ })
    const cssRulesToggle = screen.getByRole('button', { name: /^Css-Rules$/ })
    const htmlRulesToggle = screen.getByRole('button', { name: /^Html-Rules$/ })
    const guidesToggle = screen.getByRole('button', { name: /^How-to-guides$/ })

    expect(gettingStartedToggle).toHaveAttribute('aria-expanded', 'true')
    expect(widgetsToggle).toHaveAttribute('aria-expanded', 'false')
    expect(featuresToggle).toHaveAttribute('aria-expanded', 'false')
    expect(cssRulesToggle).toHaveAttribute('aria-expanded', 'false')
    expect(htmlRulesToggle).toHaveAttribute('aria-expanded', 'false')
    expect(guidesToggle).toHaveAttribute('aria-expanded', 'false')

    expect(screen.getByRole('heading', { level: 1, name: 'Overview' })).toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: /^Installation$/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Installation' })).toBeInTheDocument()
    expect(screen.getByText('Add details, guides, examples and notes for Getting Started here.')).toBeInTheDocument()

    fireEvent.click(widgetsToggle)
    expect(widgetsToggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Button$/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Button' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Primary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Secondary' })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: 'Ghost' })).toBeInTheDocument()

    fireEvent.click(featuresToggle)
    expect(featuresToggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Css-Breakpoints$/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Css-Breakpoints' })).toBeInTheDocument()

    fireEvent.click(guidesToggle)
    expect(guidesToggle).toHaveAttribute('aria-expanded', 'true')
    fireEvent.click(screen.getByRole('button', { name: /^Site-1$/ }))
    expect(screen.getByRole('heading', { level: 1, name: 'Site-1' })).toBeInTheDocument()
  }, 15000)
})
