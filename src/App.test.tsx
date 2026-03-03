import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getDefaultEntry } from './appState'
import { fetchAvailableVersions } from './docs/githubVersions'

vi.mock('./docs/githubVersions', () => ({
  fetchAvailableVersions: vi.fn(),
}))

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    vi.mocked(fetchAvailableVersions).mockResolvedValue(['1.4.2', '1.4.0', '1.3.0'])
  })

  it('uses fallback entry selection when overview is missing', () => {
    expect(
      getDefaultEntry([
        {
          category: 'Features',
          entries: ['Default'],
        },
      ]),
    ).toEqual({ category: 'Features', entry: 'Default' })

    expect(getDefaultEntry([])).toBeNull()
  })

  it('renders markdown-driven docs with language and theme controls', async () => {
    render(<App />)

    const gettingStartedToggle = screen.getByRole('button', { name: /^Getting Started$/ })
    expect(gettingStartedToggle).toHaveAttribute('aria-expanded', 'true')
    const overviewEntry = screen.getByRole('button', { name: /^Overview$/ })
    expect(overviewEntry).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Widgets$/ })).not.toBeInTheDocument()

    fireEvent.click(gettingStartedToggle)
    await waitFor(() => expect(gettingStartedToggle).toHaveAttribute('aria-expanded', 'false'))
    expect(screen.queryByRole('button', { name: /^Overview$/ })).not.toBeInTheDocument()

    fireEvent.click(gettingStartedToggle)
    await waitFor(() => expect(gettingStartedToggle).toHaveAttribute('aria-expanded', 'true'))
    fireEvent.click(screen.getByRole('button', { name: /^Overview$/ }))

    expect(screen.getByRole('heading', { level: 1, name: /Bevy Extended UI - Overview/ })).toBeInTheDocument()
    expect(document.querySelector('.description')).not.toBeNull()

    expect(document.documentElement).toHaveAttribute('data-theme', 'light')
    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    await waitFor(() => expect(document.documentElement).toHaveAttribute('data-theme', 'dark'))

    fireEvent.click(screen.getByRole('button', { name: 'Language' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deutsch' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Sprache' })).toBeInTheDocument())

    fireEvent.click(screen.getByRole('button', { name: 'Sprache' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Englisch (US)' }))
    await waitFor(() => expect(screen.getByRole('button', { name: 'Language' })).toBeInTheDocument())

    expect(screen.getByRole('option', { name: '1.4.2 (Latest)' })).toBeInTheDocument()
    expect(screen.getByRole('option', { name: '1.4.0' })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.4.0' } })
    expect(screen.getByRole('heading', { level: 1, name: /Bevy Extended UI - Overview \(v1.4.0\)/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.3.0' } })
    expect(screen.getByRole('heading', { level: 3, name: /No documentation found/i })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.4.2' } })
    expect(screen.getByRole('heading', { level: 1, name: /Bevy Extended UI - Overview/ })).toBeInTheDocument()
  }, 15000)

  it('keeps default version when remote version list is empty', async () => {
    vi.mocked(fetchAvailableVersions).mockResolvedValueOnce([])

    render(<App />)

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Version' })).toHaveValue('1.4.2'))
    expect(screen.getByRole('option', { name: '1.4.2 (Latest)' })).toBeInTheDocument()
  })
})
