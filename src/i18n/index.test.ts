import { describe, expect, it } from 'vitest'
import { t } from './index'

describe('i18n', () => {
  it('resolves known translations', () => {
    expect(t('en-US', 'search_placeholder')).toBe('Search')
    expect(t('de-DE', 'search_placeholder')).toBe('Suche')
  })

  it('falls back to key for unknown message ids', () => {
    expect(t('en-US', 'unknown_translation_key')).toBe('unknown_translation_key')
  })
})
