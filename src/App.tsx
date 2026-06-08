import { useEffect, useMemo, useState, type KeyboardEvent as ReactKeyboardEvent } from 'react'
import './App.css'
import { listDocs, getDocMarkdown, latestVersion, type DocsLocale } from './docs/catalog'
import MarkdownPage from './docs/MarkdownPage'
import { parseMarkdownDoc } from './docs/markdown'
import { fetchAvailableVersions } from './docs/githubVersions'
import { fetchRemoteDocsBundle, type RemoteDocsBundle } from './docs/githubDocs'
import { t, type LanguageCode } from './i18n'
import { createInitialExpanded, getDefaultEntry, type ActiveEntry } from './appState'

type MarketplaceWidgetApi = {
  setupMarketplaceWidget: (widgetType: string, pluginId: number, targetSelector: string) => void
}

declare global {
  interface Window {
    MarketplaceWidget?: MarketplaceWidgetApi
  }
}

const DEFAULT_VERSION = latestVersion
const DEFAULT_DOCS_LOCALE: DocsLocale = 'en_US'
const initialDocs = listDocs(DEFAULT_VERSION, DEFAULT_DOCS_LOCALE)
const STORAGE_THEME_KEY = 'bevy_ex_ui_web_doc_theme'
const STORAGE_LANGUAGE_KEY = 'bevy_ex_ui_web_doc_language'
const STORAGE_ACCENT_KEY = 'bevy_ex_ui_web_doc_accent'
const STORAGE_BETA_KEY = 'bevy_ex_ui_web_doc_beta'
const DEFAULT_THEME: 'light' | 'dark' = 'light'
const DEFAULT_LANGUAGE: LanguageCode = 'en-US'
const DEFAULT_ACCENT_COLOR = '#195cc7'
const HEX_COLOR_PATTERN = /^#[0-9a-fA-F]{6}$/
const NO_VERSION_VALUE = '__no_version__'
const MARKETPLACE_WIDGET_SCRIPT_ID = 'jetbrains-marketplace-widget-script'
const MARKETPLACE_WIDGET_CONTAINER_ID = 'jetbrains-marketplace-widget'
const ACCENT_COLOR_PRESET = [
  '#195cc7',
  '#ff5533',
  '#ef476f',
  '#f78c6b',
  '#f4a261',
  '#ffbe0b',
  '#8ab17d',
  '#06d6a0',
  '#2a9d8f',
  '#00a896',
  '#118ab2',
  '#3a86ff',
  '#577590',
  '#8338ec',
  '#9b5de5',
  '#f15bb5',
  '#ff006e',
  '#fb5607',
  '#43aa8b',
  '#457b9d',
]

function toHexChannel(value: number) {
  return value.toString(16).padStart(2, '0')
}

function hslToHex(hue: number, saturation: number, lightness: number) {
  const s = saturation / 100
  const l = lightness / 100
  const c = (1 - Math.abs(2 * l - 1)) * s
  const x = c * (1 - Math.abs(((hue / 60) % 2) - 1))
  const m = l - c / 2

  let red = 0
  let green = 0
  let blue = 0

  if (hue < 60) {
    red = c
    green = x
  } else if (hue < 120) {
    red = x
    green = c
  } else if (hue < 180) {
    green = c
    blue = x
  } else if (hue < 240) {
    green = x
    blue = c
  } else if (hue < 300) {
    red = x
    blue = c
  } else {
    red = c
    blue = x
  }

  const r = Math.round((red + m) * 255)
  const g = Math.round((green + m) * 255)
  const b = Math.round((blue + m) * 255)

  return `#${toHexChannel(r)}${toHexChannel(g)}${toHexChannel(b)}`
}

function buildGeneratedAccentPalette() {
  const colors: string[] = []

  for (let row = 0; row < 10; row += 1) {
    for (let column = 0; column < 10; column += 1) {
      const hue = (column * 36 + row * 11) % 360
      const saturation = Math.min(88, 64 + (column % 4) * 5)
      const lightness = Math.min(68, 38 + row * 3)
      colors.push(hslToHex(hue, saturation, lightness))
    }
  }

  return colors
}

const ACCENT_COLOR_OPTIONS = [...new Set([...ACCENT_COLOR_PRESET, ...buildGeneratedAccentPalette()])].slice(0, 100)
const ACCENT_COLOR_SET = new Set(ACCENT_COLOR_OPTIONS.map((color) => color.toLowerCase()))

function getEntryLabel(entry: string) {
  return entry.replace(/^\d+_/, '')
}

function normalizeSearchValue(value: string) {
  return value
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, ' ')
}

function compactSearchValue(value: string) {
  return value.replace(/\s+/g, '')
}

function matchesSearchValue(value: string, normalizedQuery: string, compactQuery: string) {
  const normalizedValue = normalizeSearchValue(value)
  if (normalizedValue.includes(normalizedQuery)) {
    return true
  }

  if (!compactQuery) {
    return false
  }

  return compactSearchValue(normalizedValue).includes(compactQuery)
}

function getStorageValue(key: string) {
  if (typeof window === 'undefined') {
    return null
  }

  try {
    return window.localStorage.getItem(key)
  } catch {
    return null
  }
}

function setStorageValue(key: string, value: string) {
  if (typeof window === 'undefined') {
    return
  }

  try {
    window.localStorage.setItem(key, value)
  } catch {
    // ignore storage write errors
  }
}

function parseTheme(value: string | null): 'light' | 'dark' {
  return value === 'dark' ? 'dark' : DEFAULT_THEME
}

function parseLanguage(value: string | null): LanguageCode {
  return value === 'de-DE' ? 'de-DE' : DEFAULT_LANGUAGE
}

function normalizeAccentColor(value: string | null | undefined) {
  if (!value) {
    return DEFAULT_ACCENT_COLOR
  }

  const trimmed = value.trim().toLowerCase()
  if (!HEX_COLOR_PATTERN.test(trimmed)) {
    return DEFAULT_ACCENT_COLOR
  }

  return ACCENT_COLOR_SET.has(trimmed) ? trimmed : DEFAULT_ACCENT_COLOR
}

function parseIncludeBeta(value: string | null) {
  return value === 'true'
}

function GithubIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 2A10 10 0 0 0 8.84 21.49c.5.09.68-.21.68-.47v-1.67c-2.78.6-3.37-1.17-3.37-1.17a2.65 2.65 0 0 0-1.11-1.46c-.91-.62.07-.61.07-.61a2.1 2.1 0 0 1 1.53 1 2.14 2.14 0 0 0 2.93.84 2.15 2.15 0 0 1 .64-1.35c-2.22-.25-4.56-1.11-4.56-4.94a3.87 3.87 0 0 1 1-2.68 3.57 3.57 0 0 1 .1-2.64s.84-.27 2.75 1a9.48 9.48 0 0 1 5 0c1.9-1.28 2.74-1 2.74-1a3.57 3.57 0 0 1 .1 2.64 3.87 3.87 0 0 1 1 2.68c0 3.84-2.35 4.68-4.58 4.93a2.41 2.41 0 0 1 .68 1.87V21c0 .26.18.57.69.47A10 10 0 0 0 12 2Z"
        fill="currentColor"
      />
    </svg>
  )
}

function MoonIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.33 14.37a8 8 0 0 1-10.7-10.7 1 1 0 0 0-1.26-1.26A10 10 0 1 0 21.59 15.63a1 1 0 0 0-1.26-1.26Z"
        fill="currentColor"
      />
    </svg>
  )
}

function SunIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M12 7a5 5 0 1 0 0 10 5 5 0 0 0 0-10Zm0-5a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0V3a1 1 0 0 1 1-1Zm0 16a1 1 0 0 1 1 1v2a1 1 0 0 1-2 0v-2a1 1 0 0 1 1-1Zm10-6a1 1 0 0 1-1 1h-2a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1ZM7 12a1 1 0 0 1-1 1H4a1 1 0 0 1 0-2h2a1 1 0 0 1 1 1Zm11.07-6.07a1 1 0 0 1 0 1.42l-1.42 1.42a1 1 0 1 1-1.41-1.42l1.41-1.42a1 1 0 0 1 1.42 0ZM8.76 15.24a1 1 0 0 1 0 1.41l-1.41 1.42a1 1 0 0 1-1.42-1.42l1.42-1.41a1 1 0 0 1 1.41 0Zm8.48 2.83a1 1 0 0 1-1.41 0l-1.42-1.42a1 1 0 0 1 1.42-1.41l1.41 1.41a1 1 0 0 1 0 1.42ZM8.76 8.76a1 1 0 0 1-1.41 0L5.93 7.34a1 1 0 1 1 1.42-1.41l1.41 1.41a1 1 0 0 1 0 1.42Z"
        fill="currentColor"
      />
    </svg>
  )
}

function BrushIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path
        d="M20.71 4.04a2.5 2.5 0 0 0-3.54 0L9 12.22l-1.43 4.24 4.24-1.43 8.19-8.19a2.5 2.5 0 0 0 0-3.54Zm-10.06 9.7 6.88-6.88 1.46 1.46-6.88 6.88-1.94.65.48-2.11ZM6.25 16.5a3.75 3.75 0 0 1 2.77 6.28A3.74 3.74 0 0 1 2.75 20a1 1 0 1 1 2 0 1.75 1.75 0 1 0 1.5-1.73 1 1 0 0 1 0-1.77Z"
        fill="currentColor"
      />
    </svg>
  )
}

function UsFlagIcon() {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect width="28" height="20" rx="2" fill="#fff" />
      <path d="M0 2h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0zm0 4h28v2H0z" fill="#b22234" />
      <rect width="12" height="10" rx="1.2" fill="#3c3b6e" />
    </svg>
  )
}

function GermanyFlagIcon() {
  return (
    <svg viewBox="0 0 28 20" aria-hidden="true">
      <rect width="28" height="20" rx="2" fill="#ffce00" />
      <rect width="28" height="13.33" rx="2" fill="#dd0000" />
      <rect width="28" height="6.66" rx="2" fill="#000" />
    </svg>
  )
}

function ChevronDownIcon() {
  return (
    <svg viewBox="0 0 24 24" aria-hidden="true">
      <path d="M7.41 8.59 12 13.17l4.59-4.58L18 10l-6 6-6-6z" fill="currentColor" />
    </svg>
  )
}

function App() {
  const [selectedVersion, setSelectedVersion] = useState(DEFAULT_VERSION)
  const [availableVersions, setAvailableVersions] = useState<string[]>([DEFAULT_VERSION])
  const [includeBetaVersions, setIncludeBetaVersions] = useState(() => parseIncludeBeta(getStorageValue(STORAGE_BETA_KEY)))
  const [activeEntry, setActiveEntry] = useState<ActiveEntry | null>(() => getDefaultEntry(initialDocs))
  const [theme, setTheme] = useState<'light' | 'dark'>(() => parseTheme(getStorageValue(STORAGE_THEME_KEY)))
  const [language, setLanguage] = useState<LanguageCode>(() => parseLanguage(getStorageValue(STORAGE_LANGUAGE_KEY)))
  const [accentColor, setAccentColor] = useState<string>(() => normalizeAccentColor(getStorageValue(STORAGE_ACCENT_KEY)))
  const [isAccentOpen, setIsAccentOpen] = useState(false)
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [searchQuery, setSearchQuery] = useState('')
  const [expandedSections, setExpandedSections] = useState<Record<string, boolean>>(() => createInitialExpanded(initialDocs))
  const [remoteDocs, setRemoteDocs] = useState<RemoteDocsBundle | null>(null)
  const [isDocsLoading, setIsDocsLoading] = useState(true)

  const docsLocale: DocsLocale = language === 'de-DE' ? 'de_DE' : 'en_US'
  const effectiveRemoteDocs = selectedVersion === NO_VERSION_VALUE ? null : remoteDocs
  const localDocsNavigation = useMemo(() => listDocs(selectedVersion, docsLocale), [docsLocale, selectedVersion])
  const docsNavigation = effectiveRemoteDocs?.sections ?? localDocsNavigation
  const docsByKey = useMemo(() => {
    if (effectiveRemoteDocs?.docsByKey) {
      return effectiveRemoteDocs.docsByKey
    }

    const local: Record<string, string> = {}
    for (const section of localDocsNavigation) {
      for (const entry of section.entries) {
        const key = `${section.category}/${entry}`
        local[key] = getDocMarkdown(selectedVersion, section.category, entry, docsLocale) ?? ''
      }
    }
    return local
  }, [docsLocale, effectiveRemoteDocs?.docsByKey, localDocsNavigation, selectedVersion])
  const normalizedSearchQuery = normalizeSearchValue(searchQuery)
  const compactSearchQuery = compactSearchValue(normalizedSearchQuery)
  const isSearchActive = normalizedSearchQuery.length > 0
  const searchResult = useMemo(() => {
    if (!isSearchActive) {
      return {
        sections: docsNavigation,
        totalMatches: docsNavigation.reduce((sum, section) => sum + section.entries.length, 0),
        firstMatch: null as ActiveEntry | null,
      }
    }

    let firstMatch: ActiveEntry | null = null
    const sections = docsNavigation
      .map((section) => {
        const sectionMatch = matchesSearchValue(section.category, normalizedSearchQuery, compactSearchQuery)
        const entries = sectionMatch
          ? section.entries
          : section.entries.filter((entry) => {
              const label = getEntryLabel(entry)
              const key = `${section.category}/${entry}`
              const markdown = docsByKey[key] ?? ''
              return (
                matchesSearchValue(entry, normalizedSearchQuery, compactSearchQuery) ||
                matchesSearchValue(label, normalizedSearchQuery, compactSearchQuery) ||
                matchesSearchValue(markdown, normalizedSearchQuery, compactSearchQuery)
              )
            })

        if (entries.length === 0) {
          return null
        }

        if (!firstMatch) {
          firstMatch = { category: section.category, entry: entries[0] }
        }

        return {
          category: section.category,
          entries,
        }
      })
      .filter((section): section is { category: string; entries: string[] } => section !== null)

    const totalMatches = sections.reduce((sum, section) => sum + section.entries.length, 0)
    return { sections, totalMatches, firstMatch }
  }, [compactSearchQuery, docsByKey, docsNavigation, isSearchActive, normalizedSearchQuery])
  const displayedDocsNavigation = searchResult.sections
  const isIdePluginEntry = activeEntry ? getEntryLabel(activeEntry.entry).toLowerCase() === 'ide-plugin' : false

  useEffect(() => {
    setExpandedSections((prev) => {
      const next = { ...prev }

      for (const key of Object.keys(next)) {
        if (!docsNavigation.some((section) => section.category === key)) {
          delete next[key]
        }
      }

      for (const section of docsNavigation) {
        if (next[section.category] === undefined) {
          next[section.category] = section.category === 'Getting Started'
        }
      }

      return next
    })

    if (!activeEntry) {
      setActiveEntry(getDefaultEntry(docsNavigation))
      return
    }

    const exists = docsNavigation.some(
      (section) => section.category === activeEntry.category && section.entries.includes(activeEntry.entry),
    )

    if (!exists) {
      setActiveEntry(getDefaultEntry(docsNavigation))
    }
  }, [activeEntry, docsNavigation])

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
    setStorageValue(STORAGE_THEME_KEY, theme)
  }, [theme])

  useEffect(() => {
    document.documentElement.style.setProperty('--brand-main', accentColor)
    setStorageValue(STORAGE_ACCENT_KEY, accentColor)
  }, [accentColor])

  useEffect(() => {
    setStorageValue(STORAGE_LANGUAGE_KEY, language)
  }, [language])

  useEffect(() => {
    setStorageValue(STORAGE_BETA_KEY, String(includeBetaVersions))
  }, [includeBetaVersions])

  useEffect(() => {
    if (!isAccentOpen) {
      return
    }

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === 'Escape') {
        setIsAccentOpen(false)
      }
    }

    window.addEventListener('keydown', onEscape)
    return () => {
      window.removeEventListener('keydown', onEscape)
    }
  }, [isAccentOpen])

  useEffect(() => {
    if (!isIdePluginEntry) {
      return
    }

    const targetSelector = `#${MARKETPLACE_WIDGET_CONTAINER_ID}`
    const target = document.querySelector<HTMLElement>(targetSelector)
    if (!target) {
      return
    }

    const setupWidget = () => {
      if (!window.MarketplaceWidget) {
        return
      }
      target.innerHTML = ''
      window.MarketplaceWidget.setupMarketplaceWidget('install', 32154, targetSelector)
    }

    const existingScript = document.getElementById(MARKETPLACE_WIDGET_SCRIPT_ID) as HTMLScriptElement | null

    if (existingScript) {
      if (window.MarketplaceWidget) {
        setupWidget()
      } else {
        existingScript.addEventListener('load', setupWidget, { once: true })
      }
      return () => existingScript.removeEventListener('load', setupWidget)
    }

    const script = document.createElement('script')
    script.id = MARKETPLACE_WIDGET_SCRIPT_ID
    script.src = 'https://plugins.jetbrains.com/assets/scripts/mp-widget.js'
    script.async = true
    script.addEventListener('load', setupWidget, { once: true })
    document.body.appendChild(script)

    return () => script.removeEventListener('load', setupWidget)
  }, [isIdePluginEntry])

  useEffect(() => {
    let ignore = false

    fetchAvailableVersions({ includeBeta: includeBetaVersions }).then((versions) => {
      if (ignore) {
        return
      }

      setAvailableVersions(versions)
      if (versions.length === 0) {
        setSelectedVersion(NO_VERSION_VALUE)
        return
      }

      setSelectedVersion((current) => (versions.includes(current) ? current : versions[0]))
    })

    return () => {
      ignore = true
    }
  }, [includeBetaVersions])

  useEffect(() => {
    if (selectedVersion === NO_VERSION_VALUE) {
      return
    }

    let ignore = false
    setIsDocsLoading(true)
    setRemoteDocs(null)

    fetchRemoteDocsBundle(selectedVersion, docsLocale)
      .then((bundle) => {
        if (ignore) {
          return
        }
        console.info('[remote-docs] app received bundle', {
          version: selectedVersion,
          locale: docsLocale,
          sections: bundle?.sections.length ?? 0,
          entries: bundle ? Object.keys(bundle.docsByKey).length : 0,
        })
        setRemoteDocs(bundle)
        setIsDocsLoading(false)
      })
      .catch(() => {
        if (ignore) {
          return
        }
        console.info('[remote-docs] app failed to load remote bundle; using local fallback', {
          version: selectedVersion,
          locale: docsLocale,
        })
        setRemoteDocs(null)
        setIsDocsLoading(false)
      })

    return () => {
      ignore = true
    }
  }, [docsLocale, selectedVersion])

  const activeDocKey = activeEntry ? `${activeEntry.category}/${activeEntry.entry}` : null
  const remoteMarkdownSource = activeDocKey ? effectiveRemoteDocs?.docsByKey[activeDocKey] : null
  const localMarkdownSource = activeEntry
    ? getDocMarkdown(selectedVersion, activeEntry.category, activeEntry.entry, docsLocale)
    : null
  const markdownSource = remoteMarkdownSource ?? localMarkdownSource
  const runtimeBaseUrl = (import.meta.env.BASE_URL ?? '/').replace(/\/$/, '')
  const parsedDoc = useMemo(
    () => (markdownSource ? parseMarkdownDoc(markdownSource, runtimeBaseUrl) : null),
    [markdownSource, runtimeBaseUrl],
  )
  const breadcrumb = activeEntry ? `${activeEntry.category} / ${getEntryLabel(activeEntry.entry)}` : ''

  const toggleSection = (section: string) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const selectLanguage = (value: LanguageCode) => {
    setLanguage(value)
    setIsLanguageOpen(false)
  }

  const toggleAccentPicker = () => {
    setIsAccentOpen((prev) => !prev)
  }

  const selectAccentColor = (value: string) => {
    setAccentColor(value)
    setIsAccentOpen(false)
  }

  const handleSearchKeyDown = (event: ReactKeyboardEvent<HTMLInputElement>) => {
    if (event.key !== 'Enter' || !isSearchActive) {
      return
    }

    const firstMatch = searchResult.firstMatch
    if (!firstMatch) {
      return
    }

    setActiveEntry(firstMatch)
    setExpandedSections((prev) => ({
      ...prev,
      [firstMatch.category]: true,
    }))
  }

  const ThemeToggleIcon = theme === 'light' ? MoonIcon : SunIcon
  const themeToggleLabel = theme === 'light' ? t(language, 'theme_to_dark') : t(language, 'theme_to_light')
  const accentColorButtonAria = t(language, 'accent_color_button_aria')
  const accentColorPickerAria = t(language, 'accent_color_picker_aria')
  const accentColorDialogAria = t(language, 'accent_color_dialog_aria')
  const pluginReleasesButtonAria = t(language, 'plugin_releases_button_aria')
  const noVersionLabel = t(language, 'no_version_option')
  const isGerman = language === 'de-DE'
  const LanguageFlagIcon = isGerman ? GermanyFlagIcon : UsFlagIcon

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="header-left">
          <span className="header-brand">Bevy Extended Ui</span>
          <div className="version-controls">
            <select
              className="version-select"
              value={selectedVersion}
              aria-label="Version"
              disabled={availableVersions.length === 0}
              onChange={(event) => setSelectedVersion(event.target.value)}
            >
              {availableVersions.length === 0 ? (
                <option value={NO_VERSION_VALUE}>{noVersionLabel}</option>
              ) : (
                availableVersions.map((version, index) => (
                  <option key={version} value={version}>
                    {index === 0 ? `${version} (Latest)` : version}
                  </option>
                ))
              )}
            </select>
            <label className="beta-filter">
              <input
                type="checkbox"
                checked={includeBetaVersions}
                aria-label="Beta"
                onChange={(event) => setIncludeBetaVersions(event.target.checked)}
              />
              <span>Beta</span>
            </label>
          </div>
        </div>

        <div className="header-right">
          <input
            className="search-input"
            type="search"
            placeholder={t(language, 'search_placeholder')}
            aria-label={t(language, 'search_placeholder')}
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            onKeyDown={handleSearchKeyDown}
          />

          <div className="language-menu">
            <button
              type="button"
              className="icon-button language-button"
              aria-label={t(language, 'language_button_aria')}
              aria-expanded={isLanguageOpen}
              onClick={() => setIsLanguageOpen((prev) => !prev)}
            >
              <LanguageFlagIcon />
              <span className={`language-chevron ${isLanguageOpen ? 'open' : ''}`} aria-hidden="true">
                <ChevronDownIcon />
              </span>
            </button>

            {isLanguageOpen ? (
              <div className="language-dropdown" role="menu" aria-label={t(language, 'language_options_aria')}>
                <button type="button" className="language-option" role="menuitem" onClick={() => selectLanguage('en-US')}>
                  <UsFlagIcon />
                  <span>{t(language, 'language_option_english')}</span>
                </button>
                <button type="button" className="language-option" role="menuitem" onClick={() => selectLanguage('de-DE')}>
                  <GermanyFlagIcon />
                  <span>{t(language, 'language_option_german')}</span>
                </button>
              </div>
            ) : null}
          </div>

          <a
            className="icon-button"
            href="https://github.com/exepta/bevy_extended_ui"
            target="_blank"
            rel="noreferrer"
            aria-label="GitHub"
          >
            <GithubIcon />
          </a>
          <button
            type="button"
            className="icon-button accent-color-button"
            aria-label={accentColorButtonAria}
            aria-expanded={isAccentOpen}
            onClick={toggleAccentPicker}
          >
            <BrushIcon />
            <span className="accent-color-dot" style={{ backgroundColor: accentColor }} aria-hidden="true" />
          </button>
          <button type="button" className="icon-button" aria-label={themeToggleLabel} onClick={toggleTheme}>
            <ThemeToggleIcon />
          </button>
        </div>
      </header>

      <div className="docs-app">
        <aside className="docs-sidebar" aria-label="Sidebar">
          <div className="brand-block">
            <p className="brand-kicker">{t(language, 'component_library')}</p>
            <h2>{t(language, 'ui_docs')}</h2>
          </div>

          <nav aria-label="Documentation navigation">
            <ul className="nav-list">
              {displayedDocsNavigation.map((section) => {
                const sectionExpanded = isSearchActive ? true : Boolean(expandedSections[section.category])
                return (
                <li key={section.category} className="nav-group">
                  <button
                    type="button"
                    className="group-title group-toggle"
                    aria-expanded={sectionExpanded}
                    onClick={() => {
                      if (!isSearchActive) {
                        toggleSection(section.category)
                      }
                    }}
                  >
                    <span>{section.category}</span>
                    <span
                      className={`group-chevron ${sectionExpanded ? 'expanded' : ''}`}
                      aria-hidden="true"
                    >
                      <ChevronDownIcon />
                    </span>
                  </button>

                  {sectionExpanded ? (
                    <ul className="entry-list">
                      {section.entries.map((entry) => {
                        const isActive = activeEntry?.category === section.category && activeEntry.entry === entry
                        return (
                          <li key={entry}>
                            <button
                              type="button"
                              className={`entry-link ${isActive ? 'active' : ''}`}
                              onClick={() => setActiveEntry({ category: section.category, entry })}
                            >
                              {getEntryLabel(entry)}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </li>
                )
              })}
            </ul>
            {isSearchActive && searchResult.totalMatches === 0 ? (
              <p className="search-empty">{language === 'de-DE' ? 'Keine Treffer' : 'No matches'}</p>
            ) : null}
          </nav>
        </aside>

        <main className="docs-content">
          <div className="docs-content-inner">
            {parsedDoc && activeEntry ? (
              <>
                <p className="breadcrumb">{breadcrumb}</p>
                <MarkdownPage doc={parsedDoc} theme={theme} />
                {isIdePluginEntry ? (
                  <section className="marketplace-widget-section">
                    <div
                      id={MARKETPLACE_WIDGET_CONTAINER_ID}
                      className="marketplace-widget"
                      aria-label={pluginReleasesButtonAria}
                    />
                  </section>
                ) : null}
              </>
            ) : (
              <section className="docs-section">
                <h3>{language === 'de-DE' ? 'Keine Dokumentation gefunden' : 'No documentation found'}</h3>
                <p>
                  {language === 'de-DE'
                    ? 'Lege Markdown-Dateien unter /docs/<Kategorie>/<de_DE|en_US>/<Eintrag>.md an.'
                    : 'Add Markdown files under /docs/<Category>/<de_DE|en_US>/<Entry>.md.'}
                </p>
              </section>
            )}
          </div>
        </main>
      </div>

      {selectedVersion !== NO_VERSION_VALUE && isDocsLoading ? (
        <div className="docs-loading-overlay" role="status" aria-live="polite" aria-label="Docs loading">
          <div className="docs-loading-card">
            <span className="docs-loading-spinner" aria-hidden="true" />
            <p>{language === 'de-DE' ? 'Bitte Warten!' : 'Please Wait!'}</p>
          </div>
        </div>
      ) : null}

      {isAccentOpen ? (
        <div className="accent-modal-overlay" onClick={(event) => event.target === event.currentTarget && setIsAccentOpen(false)}>
          <div className="accent-modal-card" role="dialog" aria-modal="true" aria-label={accentColorDialogAria}>
            <div className="accent-palette" role="listbox" aria-label={accentColorPickerAria}>
              {ACCENT_COLOR_OPTIONS.map((color) => (
                <button
                  key={color}
                  type="button"
                  className={`accent-swatch ${accentColor === color ? 'selected' : ''}`}
                  style={{ backgroundColor: color }}
                  aria-label={`${accentColorPickerAria}: ${color}`}
                  aria-pressed={accentColor === color}
                  title={color}
                  onClick={() => selectAccentColor(color)}
                />
              ))}
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}

export default App
