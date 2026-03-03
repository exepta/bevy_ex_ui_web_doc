import { latestVersion, toDocsSections, type DocsLocale, type DocsSection } from './catalog'

const REPO_OWNER = 'exepta'
const REPO_NAME = 'bevy_extended_ui'
const RAW_BASE_URL = `https://cdn.jsdelivr.net/gh/${REPO_OWNER}/${REPO_NAME}@`
const GITHUB_RAW_BASE_URL = `https://raw.githubusercontent.com/${REPO_OWNER}/${REPO_NAME}/`
const GITHUB_API_BASE_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}`
const FLAT_INDEX_BASE_URL = `https://data.jsdelivr.com/v1/package/gh/${REPO_OWNER}/${REPO_NAME}@`
const DEFAULT_LOCALE: DocsLocale = 'en_US'
const DEBUG_PREFIX = '[remote-docs]'

export type RemoteDocsBundle = {
  sections: DocsSection[]
  docsByKey: Record<string, string>
}

type FetchRemoteDocsOptions = {
  preferMainRef?: boolean
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

function createCacheBypassSuffix(ref: string) {
  if (ref !== 'main') {
    return ''
  }

  return `?ts=${Date.now()}`
}

function encodeDirectoryPath(path: string) {
  const trimmed = path.replace(/^\/+|\/+$/g, '')
  if (!trimmed) {
    return ''
  }

  return `${encodePath(trimmed)}/`
}

function extractRepoPathsFromDirectoryListing(html: string, ref: string) {
  const prefix = `/gh/${REPO_OWNER}/${REPO_NAME}@${ref}/`
  const regex = /href="([^"]+)"/g
  const paths: string[] = []
  let match = regex.exec(html)

  while (match) {
    const href = match[1]
    if (href.startsWith(prefix)) {
      const rawPath = href.slice(prefix.length)
      if (rawPath.length > 0 && rawPath !== '../') {
        const normalized = rawPath.startsWith('/') ? rawPath.slice(1) : rawPath
        paths.push(normalized)
      }
    }

    match = regex.exec(html)
  }

  return paths
}

async function fetchDirectoryListing(ref: string, directory: string) {
  const encodedDirectory = encodeDirectoryPath(directory)
  const response = await fetch(`${RAW_BASE_URL}${encodeURIComponent(ref)}/${encodedDirectory}${createCacheBypassSuffix(ref)}`)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`jsDelivr directory request failed for ${directory}@${ref}: ${response.status}`)
  }

  return response.text()
}

async function fetchMarkdownPathsFromDirectory(ref: string, directory: string) {
  const html = await fetchDirectoryListing(ref, directory)
  if (!html) {
    return []
  }

  return extractRepoPathsFromDirectoryListing(html, ref)
    .filter((path) => path.startsWith('docs/'))
    .filter((path) => !path.endsWith('/'))
    .filter((path) => path.endsWith('.md'))
}

async function fetchDocsFileIndexFromGithubTree(ref: string) {
  debugLog(`fetch docs index via GitHub tree API for ref "${ref}"`)
  const response = await fetch(`${GITHUB_API_BASE_URL}/git/trees/${encodeURIComponent(ref)}?recursive=1`)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`GitHub tree request failed for ${ref}: ${response.status}`)
  }

  const payload = (await response.json()) as {
    tree?: Array<{ path?: string; type?: string }>
    truncated?: boolean
  }

  if (payload.truncated) {
    debugLog(`GitHub tree response truncated for ref "${ref}"`)
  }

  const files = (payload.tree ?? [])
    .filter((entry) => entry.type === 'blob')
    .map((entry) => entry.path?.trim() ?? '')
    .filter((entry) => entry.startsWith('docs/') && entry.endsWith('.md'))

  return files
}

async function fetchDocsFileIndex(ref: string) {
  if (ref === 'main') {
    try {
      const files = await fetchDocsFileIndexFromGithubTree(ref)
      if (files && files.length > 0) {
        const dedupedFiles = [...new Set(files)]
        debugLog(`docs index loaded for ref "${ref}"`, { entries: dedupedFiles.length })
        return dedupedFiles
      }
    } catch {
      debugLog(`github tree index failed for ref "${ref}"; falling back to jsDelivr`)
    }
  }

  debugLog(`fetch docs index via jsDelivr flat API for ref "${ref}"`)

  const response = await fetch(`${FLAT_INDEX_BASE_URL}${encodeURIComponent(ref)}/flat${createCacheBypassSuffix(ref)}`)
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

  if (ref === 'main' && !files.some((entry) => entry.startsWith('docs/Widgets/'))) {
    debugLog(`widgets docs missing in flat index for ref "${ref}", probing directory listings`)
    const widgetFiles = [
      ...(await fetchMarkdownPathsFromDirectory(ref, 'docs/Widgets/en_US/')),
      ...(await fetchMarkdownPathsFromDirectory(ref, 'docs/Widgets/de_DE/')),
    ]

    for (const path of widgetFiles) {
      files.push(path)
    }
  }

  const dedupedFiles = [...new Set(files)]
  debugLog(`docs index loaded for ref "${ref}"`, { entries: dedupedFiles.length })
  return dedupedFiles
}

async function fetchMarkdown(ref: string, path: string) {
  const url =
    ref === 'main'
      ? `${GITHUB_RAW_BASE_URL}${encodeURIComponent(ref)}/${encodePath(path)}${createCacheBypassSuffix(ref)}`
      : `${RAW_BASE_URL}${encodeURIComponent(ref)}/${encodePath(path)}`
  debugLog(`fetch markdown for ref "${ref}"`, { path, url })
  const response = await fetch(url)
  if (!response.ok) {
    throw new Error(`markdown request failed for ${path}@${ref}: ${response.status}`)
  }
  return response.text()
}

async function fetchBundleForRef(ref: string, locale: DocsLocale): Promise<RemoteDocsBundle | null> {
  const files = await fetchDocsFileIndex(ref)
  if (!files) {
    return null
  }

  const docsByLocale = new Map<DocsLocale, Map<string, string>>()

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

  debugLog(`selected docs for ref "${ref}"`, {
    localeRequested: locale,
    localeUsed: preferredDocs && preferredDocs.size > 0 ? locale : DEFAULT_LOCALE,
    entries: selectedDocs.size,
    keys: [...selectedDocs.keys()],
  })

  const markdownEntries = await Promise.all(
    [...selectedDocs.entries()].map(async ([key, path]) => [key, await fetchMarkdown(ref, path)] as const),
  )

  debugLog(`markdown fetched for ref "${ref}"`, { entries: markdownEntries.length })

  return {
    sections: toDocsSections(new Map(markdownEntries)),
    docsByKey: Object.fromEntries(markdownEntries),
  }
}

function getRefCandidates(version: string, preferMainRef: boolean) {
  if (preferMainRef || version === latestVersion) {
    return ['main']
  }

  return [`v${version}`, version]
}

export function resetRemoteDocsCache() {
  bundleCache.clear()
}

export async function fetchRemoteDocsBundle(version: string, locale: DocsLocale, options?: FetchRemoteDocsOptions) {
  const preferMainRef = options?.preferMainRef === true
  const shouldCache = !preferMainRef && version !== latestVersion
  const cacheKey = `${version}:${locale}:main=${preferMainRef ? '1' : '0'}`
  const inFlight = inFlightBundleCache.get(cacheKey)
  if (inFlight) {
    debugLog(`in-flight cache hit for "${cacheKey}"`)
    return inFlight
  }

  if (shouldCache) {
    const cached = bundleCache.get(cacheKey)
    if (cached) {
      debugLog(`cache hit for "${cacheKey}"`)
      return cached
    }
  } else {
    debugLog(`skip in-memory cache for latest version "${version}"`)
  }

  const promise = (async () => {
    const refs = getRefCandidates(version, preferMainRef)

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
  if (shouldCache) {
    bundleCache.set(cacheKey, trackedPromise)
  }
  return trackedPromise
}
