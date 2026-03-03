import { useEffect, useMemo, useState } from 'react'
import './App.css'
import { t, type LanguageCode } from './i18n'
import { widgetComponents, widgetNames, type WidgetName } from './widgets'

const gettingStartedItems = ['overview', 'installation', 'usage', 'exampleProjects', 'faqs'] as const
const featureItems = [
  'default',
  'cssBreakpoints',
  'wasmBreakpoints',
  'wasmDefault',
  'fluent',
  'propertiesLang',
  'clipboardWasm',
] as const
const cssRuleItems = ['basic', 'mediaQueries', 'keyframes', 'functions'] as const
const htmlRuleItems = ['structure', 'attributes', 'meta'] as const
const howToGuideItems = ['site1'] as const

type SectionId = 'gettingStarted' | 'widgets' | 'features' | 'cssRules' | 'htmlRules' | 'howToGuides'

type ActiveEntry = {
  section: SectionId
  item: string
}

type ExpandedSections = Record<SectionId, boolean>

const navSections: Array<{ id: SectionId; items: readonly string[] }> = [
  { id: 'gettingStarted', items: gettingStartedItems },
  { id: 'widgets', items: widgetNames },
  { id: 'features', items: featureItems },
  { id: 'cssRules', items: cssRuleItems },
  { id: 'htmlRules', items: htmlRuleItems },
  { id: 'howToGuides', items: howToGuideItems },
]

function toSnakeCase(value: string) {
  return value.replace(/[A-Z]/g, (match) => `_${match.toLowerCase()}`)
}

function isWidgetItem(item: string): item is WidgetName {
  return widgetNames.includes(item as WidgetName)
}

function getSectionLabel(section: SectionId, language: LanguageCode) {
  return t(language, `section_${toSnakeCase(section)}`)
}

function getItemLabel(section: SectionId, item: string, language: LanguageCode) {
  if (section === 'widgets') {
    return item
  }

  return t(language, `item_${toSnakeCase(section)}_${toSnakeCase(item)}`)
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
  const [activeEntry, setActiveEntry] = useState<ActiveEntry>({
    section: 'gettingStarted',
    item: 'overview',
  })
  const [theme, setTheme] = useState<'light' | 'dark'>('light')
  const [language, setLanguage] = useState<LanguageCode>('en-US')
  const [isLanguageOpen, setIsLanguageOpen] = useState(false)
  const [expandedSections, setExpandedSections] = useState<ExpandedSections>({
    gettingStarted: true,
    widgets: false,
    features: false,
    cssRules: false,
    htmlRules: false,
    howToGuides: false,
  })

  const activeSectionLabel = getSectionLabel(activeEntry.section, language)
  const activeItemLabel = getItemLabel(activeEntry.section, activeEntry.item, language)

  const isWidget = useMemo(
    () => activeEntry.section === 'widgets' && isWidgetItem(activeEntry.item),
    [activeEntry.item, activeEntry.section],
  )
  const activeWidgetName: WidgetName | null =
    activeEntry.section === 'widgets' && isWidgetItem(activeEntry.item) ? activeEntry.item : null
  const ActiveWidget = activeWidgetName ? widgetComponents[activeWidgetName] : null

  const description = isWidget
    ? t(language, 'widget_description', { item: activeItemLabel })
    : t(language, 'non_widget_description', { section: activeSectionLabel, item: activeItemLabel })

  const breadcrumb = `${activeSectionLabel} / ${activeItemLabel}`

  useEffect(() => {
    document.documentElement.setAttribute('data-theme', theme)
  }, [theme])

  const toggleSection = (section: SectionId) => {
    setExpandedSections((prev) => ({
      ...prev,
      [section]: !prev[section],
    }))
  }

  const selectEntry = (section: SectionId, item: string) => {
    setActiveEntry({ section, item })
    setExpandedSections((prev) => ({
      ...prev,
      [section]: true,
    }))
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === 'light' ? 'dark' : 'light'))
  }

  const selectLanguage = (value: LanguageCode) => {
    setLanguage(value)
    setIsLanguageOpen(false)
  }

  const ThemeToggleIcon = theme === 'light' ? MoonIcon : SunIcon
  const themeToggleLabel = theme === 'light' ? t(language, 'theme_to_dark') : t(language, 'theme_to_light')
  const isGerman = language === 'de-DE'
  const LanguageFlagIcon = isGerman ? GermanyFlagIcon : UsFlagIcon

  return (
    <div className="app-shell">
      <header className="top-header">
        <div className="header-left">
          <span className="header-brand">Bevy Extended Ui</span>
          <select className="version-select" defaultValue="1.4.2" aria-label="Version">
            <option value="1.4.2">1.4.2 (Latest)</option>
            <option value="1.4.0">1.4.0</option>
            <option value="1.3.0">1.3.0</option>
            <option value="1.2.0">1.2.0</option>
          </select>
        </div>

        <div className="header-right">
          <input
            className="search-input"
            type="search"
            placeholder={t(language, 'search_placeholder')}
            aria-label={t(language, 'search_placeholder')}
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
              {navSections.map((section) => (
                <li key={section.id} className="nav-group">
                  <button
                    type="button"
                    className="group-title group-toggle"
                    aria-expanded={expandedSections[section.id]}
                    onClick={() => toggleSection(section.id)}
                  >
                    <span>{getSectionLabel(section.id, language)}</span>
                    <span className={`group-chevron ${expandedSections[section.id] ? 'expanded' : ''}`} aria-hidden="true">
                      <ChevronDownIcon />
                    </span>
                  </button>

                  {expandedSections[section.id] ? (
                    <ul className="widget-list">
                      {section.items.map((item) => {
                        const isActive = activeEntry.section === section.id && activeEntry.item === item
                        return (
                          <li key={item}>
                            <button
                              type="button"
                              className={`widget-link ${isActive ? 'active' : ''}`}
                              onClick={() => selectEntry(section.id, item)}
                            >
                              {getItemLabel(section.id, item, language)}
                            </button>
                          </li>
                        )
                      })}
                    </ul>
                  ) : null}
                </li>
              ))}
            </ul>
          </nav>
        </aside>

        <main className="docs-content">
          <header className="docs-header">
            <p className="breadcrumb">{breadcrumb}</p>
            <h1>{activeItemLabel}</h1>
            <p>{description}</p>
          </header>

          <section className="docs-section">
            <h3>{t(language, 'overview_title')}</h3>
            <p>{t(language, 'overview_text')}</p>
          </section>

          <section className="docs-section">
            <h3>{t(language, 'usage_title')}</h3>
            {ActiveWidget ? (
              <ActiveWidget />
            ) : (
              <article className="widget-doc">
                <h3>{activeItemLabel}</h3>
                <p>{t(language, 'non_widget_intro')}</p>
                <div className="widget-demo">
                  <p>{t(language, 'non_widget_hint', { section: activeSectionLabel })}</p>
                </div>
              </article>
            )}
          </section>
        </main>
      </div>
    </div>
  )
}

export default App
