import { toDocsSections, type DocsLocale, type DocsSection } from './catalog'
import { applyWasmExamplesToMarkdown, parseWasmExamplesByCategory } from './wasmExamples'

const REPO_OWNER = 'exepta'
const REPO_NAME = 'bevy_extended_ui'
const RAW_BASE_URL = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@`
const FLAT_INDEX_BASE_URL = `https://data.jsdelivr.com/v1/package/gh/${REPO_OWNER}/${REPO_NAME}@`
const DEFAULT_LOCALE: DocsLocale = 'en_US'
const DEBUG_PREFIX = '[remote-docs]'
const REMOTE_WASM_EXAMPLES_PATH = 'docs/wasm_examples.json'
const LOCAL_WASM_EXAMPLES_DEBUG_PATH = 'docs/wasm_examples.local.json'

export type RemoteDocsBundle = {
  sections: DocsSection[]
  docsByKey: Record<string, string>
}

const bundleCache = new Map<string, Promise<RemoteDocsBundle | null>>()
const inFlightBundleCache = new Map<string, Promise<RemoteDocsBundle | null>>()

function debugLog(message: string, payload?: unknown) {
  if (payload !== undefined) {
    console.info(`${DEBUG_PREFIX} ${message}`, payload)
    return
  }

  console.info(`${DEBUG_PREFIX} ${message}`)
}

function normalizeLocale(segment: string): DocsLocale | null {
  const normalized = segment.replace('-', '_')
  if (normalized === 'de_DE' || normalized === 'en_US') {
    return normalized
  }
  return null
}

function parseRemoteDocPath(path: string) {
  if (!path.startsWith('docs/') || !path.endsWith('.md')) {
    return null
  }

  const relative = path.slice('docs/'.length, -'.md'.length)
  const parts = relative.split('/')
  if (parts.length < 3) {
    return null
  }

  const entry = parts[parts.length - 1]
  if (!entry) {
    return null
  }

  const localeCandidates = [0, parts.length - 2]
  for (const localeIndex of localeCandidates) {
    const locale = normalizeLocale(parts[localeIndex] ?? '')
    if (!locale) {
      continue
    }

    const categoryParts = parts.filter((_, index) => index !== localeIndex && index !== parts.length - 1)
    const category = categoryParts.join('/')
    if (!category) {
      continue
    }

    return {
      key: `${category}/${entry}`,
      locale,
      path,
    }
  }

  return null
}

function encodePath(path: string) {
  return path
    .split('/')
    .map((segment) => encodeURIComponent(segment))
    .join('/')
}

async function fetchDocsFileIndex(ref: string) {
  debugLog(`fetch docs index via jsDelivr flat API for ref "${ref}"`)

  const response = await fetch(`${FLAT_INDEX_BASE_URL}${encodeURIComponent(ref)}/flat`)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`jsDelivr flat index request failed for ${ref}: ${response.status}`)
  }

  const payload = (await response.json()) as { files?: Array<{ name?: string }> }
  const files = (payload.files ?? [])
    .map((entry) => entry.name?.trim() ?? '')
    .map((entry) => (entry.startsWith('/') ? entry.slice(1) : entry))
    .filter((entry) => entry.startsWith('docs/') && entry.endsWith('.md'))

  const dedupedFiles = [...new Set(files)]
  debugLog(`docs index loaded for ref "${ref}"`, { entries: dedupedFiles.length })
  return dedupedFiles
}

async function fetchMarkdown(ref: string, path: string) {
  const url = `${RAW_BASE_URL}${encodeURIComponent(ref)}/${encodePath(path)}`
  debugLog(`fetch markdown for ref "${ref}"`, { path, url })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`markdown request failed for ${path}@${ref}: ${response.status}`)
  }
  return response.text()
}

async function fetchWasmExamplesJson(ref: string) {
  const url = `${RAW_BASE_URL}${encodeURIComponent(ref)}/${encodePath(REMOTE_WASM_EXAMPLES_PATH)}`
  debugLog(`fetch wasm examples json for ref "${ref}"`, { path: REMOTE_WASM_EXAMPLES_PATH, url })
  const response = await fetch(url)

  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    debugLog(`wasm examples json request failed for ref "${ref}"`, { status: response.status })
    return null
  }

  try {
    return await response.json()
  } catch {
    debugLog(`wasm examples json is invalid for ref "${ref}"`)
    return null
  }
}

function withBasePath(path: string) {
  const base = import.meta.env.BASE_URL ?? '/'
  const normalizedBase = base.endsWith('/') ? base : `${base}/`
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  return `${normalizedBase}${normalizedPath}`
}

function shouldLoadLocalWasmExamplesDebug() {
  return import.meta.env.MODE === 'development' || import.meta.env.VITE_ENABLE_LOCAL_WASM_EXAMPLES_DEBUG === '1'
}

async function fetchLocalWasmExamplesJson() {
  const url = withBasePath(LOCAL_WASM_EXAMPLES_DEBUG_PATH)
  debugLog('fetch local wasm examples debug json', { path: LOCAL_WASM_EXAMPLES_DEBUG_PATH, url })

  const response = await fetch(url)
  if (!response.ok) {
    return null
  }

  return response.json()
}

async function fetchBundleForRef(ref: string, locale: DocsLocale): Promise<RemoteDocsBundle | null> {
  const [files, remoteWasmExamplesJson] = await Promise.all([fetchDocsFileIndex(ref), fetchWasmExamplesJson(ref)])
  const docsByLocale = new Map<DocsLocale, Map<string, string>>()

  if (files) {
    for (const path of files) {
      const parsed = parseRemoteDocPath(path)
      if (!parsed) {
        continue
      }

      if (!docsByLocale.has(parsed.locale)) {
        docsByLocale.set(parsed.locale, new Map<string, string>())
      }

      docsByLocale.get(parsed.locale)?.set(parsed.key, path)
    }
  }

  debugLog(`docs discovered for ref "${ref}"`, {
    de_DE: docsByLocale.get('de_DE')?.size ?? 0,
    en_US: docsByLocale.get('en_US')?.size ?? 0,
  })

  const preferredDocs = docsByLocale.get(locale)
  const fallbackDocs = docsByLocale.get(DEFAULT_LOCALE)
  const selectedDocs = preferredDocs && preferredDocs.size > 0 ? preferredDocs : fallbackDocs

  if (!selectedDocs || selectedDocs.size === 0) {
    debugLog(`no docs selected for ref "${ref}" and locale "${locale}"`)
    return null
  }

  let wasmExamplesByCategory = parseWasmExamplesByCategory(remoteWasmExamplesJson)
  if (wasmExamplesByCategory.size === 0 && shouldLoadLocalWasmExamplesDebug()) {
    try {
      const localWasmExamplesJson = await fetchLocalWasmExamplesJson()
      const localWasmExamplesByCategory = parseWasmExamplesByCategory(localWasmExamplesJson)
      if (localWasmExamplesByCategory.size > 0) {
        debugLog(`using local wasm examples debug json for ref "${ref}"`, {
          categories: localWasmExamplesByCategory.size,
        })
        wasmExamplesByCategory = localWasmExamplesByCategory
      }
    } catch {
      // keep empty wasm examples map
    }
  }

  debugLog(`selected docs for ref "${ref}"`, {
    localeRequested: locale,
    localeUsed: preferredDocs && preferredDocs.size > 0 ? locale : DEFAULT_LOCALE,
    entries: selectedDocs.size,
    keys: [...selectedDocs.keys()],
    wasmCategories: wasmExamplesByCategory.size,
  })

  const markdownEntries = await Promise.all(
    [...selectedDocs.entries()].map(async ([key, path]) => {
      const markdownSource = await fetchMarkdown(ref, path)
      const markdownWithWasmExamples = applyWasmExamplesToMarkdown(markdownSource, key, wasmExamplesByCategory)
      return [key, markdownWithWasmExamples] as const
    }),
  )

  debugLog(`markdown fetched for ref "${ref}"`, {
    entries: markdownEntries.length,
    markdownEntries: markdownEntries.length,
    wasmCategories: wasmExamplesByCategory.size,
  })

  return {
    sections: toDocsSections(new Map(markdownEntries)),
    docsByKey: Object.fromEntries(markdownEntries),
  }
}

function getRefCandidates(version: string) {
  return [`v${version}`, version]
}

export function resetRemoteDocsCache() {
  bundleCache.clear()
}

export async function fetchRemoteDocsBundle(version: string, locale: DocsLocale) {
  const cacheKey = `${version}:${locale}`
  const inFlight = inFlightBundleCache.get(cacheKey)
  if (inFlight) {
    debugLog(`in-flight cache hit for "${cacheKey}"`)
    return inFlight
  }

  const cached = bundleCache.get(cacheKey)
  if (cached) {
    debugLog(`cache hit for "${cacheKey}"`)
    return cached
  }

  const promise = (async () => {
    const refs = getRefCandidates(version)

    for (const ref of refs) {
      try {
        debugLog(`try ref "${ref}" for version "${version}" and locale "${locale}"`)
        const bundle = await fetchBundleForRef(ref, locale)
        if (bundle) {
          debugLog(`bundle resolved for ref "${ref}"`, {
            sections: bundle.sections.length,
            entries: Object.keys(bundle.docsByKey).length,
          })
          return bundle
        }
      } catch {
        debugLog(`ref "${ref}" failed; trying next`)
        continue
      }
    }

    debugLog(`no bundle found for version "${version}" and locale "${locale}"`)
    return null
  })()

  const trackedPromise = promise.finally(() => {
    inFlightBundleCache.delete(cacheKey)
  })

  inFlightBundleCache.set(cacheKey, trackedPromise)
  bundleCache.set(cacheKey, trackedPromise)
  return trackedPromise
}
