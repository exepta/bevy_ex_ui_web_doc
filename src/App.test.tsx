import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import App from './App'
import { getDefaultEntry } from './appState'
import { fetchAvailableVersions } from './docs/githubVersions'
import { fetchRemoteDocsBundle } from './docs/githubDocs'

vi.mock('./docs/githubVersions', () => ({
  fetchAvailableVersions: vi.fn(),
}))

vi.mock('./docs/githubDocs', () => ({
  fetchRemoteDocsBundle: vi.fn(),
}))

let storageState: Record<string, string> = {}

describe('App', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    storageState = {}
    Object.defineProperty(window, 'localStorage', {
      configurable: true,
      value: {
        getItem: (key: string) => storageState[key] ?? null,
        setItem: (key: string, value: string) => {
          storageState[key] = value
        },
        removeItem: (key: string) => {
          delete storageState[key]
        },
      } satisfies Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>,
    })
    vi.mocked(fetchAvailableVersions).mockImplementation(async (options?: { includeBeta?: boolean }) => {
      if (options?.includeBeta) {
        return ['1.4.2', '1.4.2.beta.1', '1.4.0', '1.3.0']
      }
      return ['1.4.2', '1.4.0', '1.3.0']
    })
    vi.mocked(fetchRemoteDocsBundle).mockImplementation(async (version, locale) => {
      if (version === '1.3.0') {
        return null
      }

      const heading = version === '1.4.0' ? '# Bevy Extended UI - Overview (v1.4.0)' : '# Bevy Extended UI - Overview'
      const description = locale === 'de_DE' ? '<p class="description">Beschreibung</p>' : '<p class="description">Description</p>'

      return {
        sections: [
          {
            category: 'Getting Started',
            entries: ['Overview'],
          },
        ],
        docsByKey: {
          'Getting Started/Overview': `${heading}\n\n${description}`,
        },
      }
    })
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

    expect(await screen.findByRole('button', { name: /^Getting Started$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Widgets$/ })).not.toBeInTheDocument()

    expect(await screen.findByRole('heading', { level: 1, name: /Bevy Extended UI - Overview/ })).toBeInTheDocument()
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
    expect(screen.queryByRole('option', { name: '1.4.2.beta.1' })).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }))
    await waitFor(() => expect(screen.getByRole('option', { name: '1.4.2.beta.1' })).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.4.0' } })
    expect(await screen.findByRole('heading', { level: 1, name: /Bevy Extended UI - Overview \(v1.4.0\)/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.3.0' } })
    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: /No documentation found/i })).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.4.2' } })
    expect(await screen.findByRole('heading', { level: 1, name: /Bevy Extended UI - Overview/ })).toBeInTheDocument()
  }, 15000)

  it('shows no-version option when remote version list is empty', async () => {
    vi.mocked(fetchAvailableVersions).mockResolvedValueOnce([])

    render(<App />)

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Version' })).toBeDisabled())
    expect(screen.getByRole('option', { name: 'No Version' })).toBeInTheDocument()
    expect(screen.getByRole('combobox', { name: 'Version' })).toHaveValue('__no_version__')
  })

  it('filters docs with search and finds widget creator by spaced query', async () => {
    vi.mocked(fetchRemoteDocsBundle).mockResolvedValueOnce({
      sections: [
        {
          category: 'Widgets',
          entries: ['24_Listbox', '25_WidgetCreator'],
        },
        {
          category: 'Features',
          entries: ['01_ThemeManager'],
        },
      ],
      docsByKey: {
        'Widgets/24_Listbox': '# Listbox',
        'Widgets/25_WidgetCreator': '# Widget Creator',
        'Features/01_ThemeManager': '# Theme Manager',
      },
    })

    render(<App />)

    expect(await screen.findByRole('button', { name: /^Widgets$/ })).toBeInTheDocument()

    const searchInput = screen.getByRole('searchbox', { name: 'Search' })
    fireEvent.change(searchInput, { target: { value: 'widgets' } })

    expect(screen.getByRole('button', { name: /^Widgets$/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: /^Features$/ })).not.toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'Widget Creator' } })
    fireEvent.keyDown(searchInput, { key: 'Enter', code: 'Enter' })

    expect(await screen.findByRole('heading', { level: 1, name: 'Widget Creator' })).toBeInTheDocument()

    fireEvent.change(searchInput, { target: { value: 'not-existing-search-term' } })
    expect(await screen.findByText('No matches')).toBeInTheDocument()
  })

  it('keeps search input focus while typing on docs with wasm iframe', async () => {
    vi.mocked(fetchRemoteDocsBundle).mockResolvedValueOnce({
      sections: [
        {
          category: 'Widgets',
          entries: ['24_Listbox'],
        },
      ],
      docsByKey: {
        'Widgets/24_Listbox': '# Listbox\n\n<iframe id="listbox" src="/examples/base/"></iframe>',
      },
    })

    render(<App />)

    const searchInput = await screen.findByRole('searchbox', { name: 'Search' })
    searchInput.focus()
    expect(searchInput).toHaveFocus()

    fireEvent.change(searchInput, { target: { value: 'list' } })
    expect(searchInput).toHaveFocus()

    fireEvent.change(searchInput, { target: { value: 'listbox' } })
    expect(searchInput).toHaveFocus()
  })

  it('persists theme, language and accent color', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_theme')).toBe('dark'))

    fireEvent.click(screen.getByRole('button', { name: 'Accent color' }))
    fireEvent.click(screen.getByRole('button', { name: 'Accent color picker: #ff5533' }))
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_accent')).toBe('#ff5533'))
    expect(document.documentElement.style.getPropertyValue('--brand-main')).toBe('#ff5533')

    fireEvent.click(screen.getByRole('button', { name: 'Language' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deutsch' }))
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_language')).toBe('de-DE'))

    fireEvent.click(screen.getByRole('checkbox', { name: 'Beta' }))
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_beta')).toBe('true'))
  })

  it('restores beta filter from storage on startup', async () => {
    storageState.bevy_ex_ui_web_doc_beta = 'true'

    render(<App />)

    const betaCheckbox = screen.getByRole('checkbox', { name: 'Beta' })
    expect(betaCheckbox).toBeChecked()
    await waitFor(() => expect(screen.getByRole('option', { name: '1.4.2.beta.1' })).toBeInTheDocument())
  })

})
