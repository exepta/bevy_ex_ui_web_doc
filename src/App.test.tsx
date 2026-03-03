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
    vi.mocked(fetchAvailableVersions).mockResolvedValue(['1.4.2', '1.4.0', '1.3.0'])
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

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.4.0' } })
    expect(await screen.findByRole('heading', { level: 1, name: /Bevy Extended UI - Overview \(v1.4.0\)/ })).toBeInTheDocument()

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.3.0' } })
    await waitFor(() => expect(screen.getByRole('heading', { level: 3, name: /No documentation found/i })).toBeInTheDocument())

    fireEvent.change(screen.getByRole('combobox', { name: 'Version' }), { target: { value: '1.4.2' } })
    expect(await screen.findByRole('heading', { level: 1, name: /Bevy Extended UI - Overview/ })).toBeInTheDocument()
  }, 15000)

  it('keeps default version when remote version list is empty', async () => {
    vi.mocked(fetchAvailableVersions).mockResolvedValueOnce([])

    render(<App />)

    await waitFor(() => expect(screen.getByRole('combobox', { name: 'Version' })).toHaveValue('1.4.2'))
    expect(screen.getByRole('option', { name: '1.4.2 (Latest)' })).toBeInTheDocument()
  })

  it('persists theme, language and accent color', async () => {
    render(<App />)

    fireEvent.click(screen.getByRole('button', { name: 'Switch to dark mode' }))
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_theme')).toBe('dark'))

    fireEvent.click(screen.getByRole('button', { name: 'Accent color' }))
    const colorInput = screen
      .getAllByLabelText('Accent color picker')
      .find((element) => element.tagName === 'INPUT') as HTMLInputElement
    fireEvent.change(colorInput, { target: { value: '#ff5533' } })
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_accent')).toBe('#ff5533'))
    expect(document.documentElement.style.getPropertyValue('--brand-main')).toBe('#ff5533')

    fireEvent.click(screen.getByRole('button', { name: 'Language' }))
    fireEvent.click(screen.getByRole('menuitem', { name: 'Deutsch' }))
    await waitFor(() => expect(localStorage.getItem('bevy_ex_ui_web_doc_language')).toBe('de-DE'))
  })

})
