import { FluentBundle, FluentResource, type FluentVariable } from '@fluent/bundle'
import deMessages from './locales/de-DE.ftl?raw'
import enMessages from './locales/en-US.ftl?raw'

export type LanguageCode = 'en-US' | 'de-DE'

function createBundle(locale: LanguageCode, messages: string) {
  const bundle = new FluentBundle(locale, { useIsolating: false })
  bundle.addResource(new FluentResource(messages))
  return bundle
}

const bundles: Record<LanguageCode, FluentBundle> = {
  'en-US': createBundle('en-US', enMessages),
  'de-DE': createBundle('de-DE', deMessages),
}

export function t(language: LanguageCode, key: string, args?: Record<string, FluentVariable>) {
  const bundle = bundles[language]
  const message = bundle.getMessage(key)

  if (!message?.value) {
    return key
  }

  return bundle.formatPattern(message.value, args)
}
