import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchRemoteDocsBundle, resetRemoteDocsCache } from './githubDocs'

type MockResponse = {
  ok: boolean
  status: number
  json?: () => Promise<unknown>
  text?: () => Promise<string>
}

function textResponse(payload: string): MockResponse {
  return {
    ok: true,
    status: 200,
    text: async () => payload,
  }
}

function jsonResponse(payload: unknown): MockResponse {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
    text: async () => JSON.stringify(payload),
  }
}

function errorResponse(status: number): MockResponse {
  return {
    ok: false,
    status,
    json: async () => ({}),
    text: async () => '',
  }
}

function flatIndex(entries: string[]) {
  return {
    files: entries.map((name) => ({ name: name.startsWith('/') ? name : `/${name}` })),
  }
}

function githubTree(entries: string[]) {
  return {
    tree: entries.map((path) => ({ path, type: 'blob' })),
    truncated: false,
  }
}

function directoryListing(ref: string, paths: string[]) {
  return paths.map((path) => `<a href="/gh/exepta/bevy_extended_ui@${ref}/${path}">${path}</a>`).join('\n')
}

function isMainMarkdownRequest(url: string) {
  return (
    (url.includes('raw.githubusercontent.com') && url.includes('/main/docs/')) ||
    (url.includes('cdn.jsdelivr.net') && url.includes('@main/docs/'))
  )
}

describe('github docs', () => {
  afterEach(() => {
    resetRemoteDocsCache()
    vi.restoreAllMocks()
  })

  it('uses main branch for latest version', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('api.github.com') && url.includes('/git/trees/main?recursive=1')) {
        return jsonResponse(githubTree(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@main/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (isMainMarkdownRequest(url)) {
        return textResponse('# Main Overview') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.2', 'en_US')

    expect(bundle?.sections).toEqual([
      {
        category: 'Getting Started',
        entries: ['Overview'],
      },
    ])
    expect(bundle?.docsByKey['Getting Started/Overview']).toContain('Main Overview')
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('@v1.4.2/docs/'))
  })

  it('falls back to english docs if requested locale is missing', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('api.github.com') && url.includes('/git/trees/main?recursive=1')) {
        return jsonResponse(githubTree(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@main/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (isMainMarkdownRequest(url)) {
        return textResponse('# EN Overview') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.2', 'de_DE')
    expect(bundle?.docsByKey['Getting Started/Overview']).toContain('EN Overview')
  })

  it('tries v-prefixed and plain refs for version tags', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('data.jsdelivr.com') && url.includes('@v1.4.0/flat')) {
        return errorResponse(404) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@1.4.0/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@1.4.0/docs/')) {
        return textResponse('# Tag Overview') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.0', 'en_US')
    expect(bundle?.docsByKey['Getting Started/Overview']).toContain('Tag Overview')
  })

  it('uses main ref when preferMainRef is enabled', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('api.github.com') && url.includes('/git/trees/main?recursive=1')) {
        return jsonResponse(githubTree(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@main/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (isMainMarkdownRequest(url)) {
        return textResponse('# Main Preferred') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.0', 'en_US', { preferMainRef: true })
    expect(bundle?.docsByKey['Getting Started/Overview']).toContain('Main Preferred')
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('@v1.4.0/docs/'))
    expect(fetchMock).not.toHaveBeenCalledWith(expect.stringContaining('@1.4.0/docs/'))
  })

  it('falls back from github tree to jsDelivr and probes widget directories on main', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('api.github.com') && url.includes('/git/trees/main?recursive=1')) {
        return errorResponse(403) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@main/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@main/docs/Widgets/en_US/')) {
        return textResponse(directoryListing('main', ['docs/Widgets/en_US/01_Button.md'])) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@main/docs/Widgets/de_DE/')) {
        return errorResponse(404) as unknown as Response
      }

      if (url.includes('raw.githubusercontent.com') && url.includes('Getting%20Started/en_US/Overview.md')) {
        return textResponse('# Main Overview') as unknown as Response
      }

      if (url.includes('raw.githubusercontent.com') && url.includes('docs/Widgets/en_US/01_Button.md')) {
        return textResponse('# Main Button') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.2', 'en_US')

    expect(bundle?.docsByKey['Getting Started/Overview']).toContain('Main Overview')
    expect(bundle?.docsByKey['Widgets/01_Button']).toContain('Main Button')
  })

  it('supports locale-first and locale-last docs paths and ignores invalid categoryless paths', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('data.jsdelivr.com') && url.includes('@v1.4.0/flat')) {
        return jsonResponse(
          flatIndex(['docs/de_DE/Widgets/00_Intro.md', 'docs/Widgets/de_DE/01_Button.md', 'docs/en_US/Overview.md']),
        ) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@v1.4.0/docs/de_DE/Widgets/00_Intro.md')) {
        return textResponse('# DE Intro') as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@v1.4.0/docs/Widgets/de_DE/01_Button.md')) {
        return textResponse('# DE Button') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.0', 'de_DE')
    expect(bundle?.docsByKey['Widgets/00_Intro']).toContain('DE Intro')
    expect(bundle?.docsByKey['Widgets/01_Button']).toContain('DE Button')
    expect(bundle?.docsByKey['Overview/']).toBeUndefined()
  })

  it('tries next version ref if markdown fetch fails on v-prefixed ref', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('data.jsdelivr.com') && url.includes('@v1.4.1/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@v1.4.1/docs/Getting%20Started/en_US/Overview.md')) {
        return errorResponse(500) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@1.4.1/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@1.4.1/docs/Getting%20Started/en_US/Overview.md')) {
        return textResponse('# Plain Ref Works') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.4.1', 'en_US')
    expect(bundle?.docsByKey['Getting Started/Overview']).toContain('Plain Ref Works')
  })

  it('returns null when no valid locale docs can be selected', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('data.jsdelivr.com') && url.includes('@v1.2.3/flat')) {
        return jsonResponse(flatIndex(['docs/fr_FR/Guide/Intro.md', 'docs/Guide/Intro.txt'])) as unknown as Response
      }

      if (url.includes('data.jsdelivr.com') && url.includes('@1.2.3/flat')) {
        return errorResponse(404) as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    const bundle = await fetchRemoteDocsBundle('1.2.3', 'en_US')
    expect(bundle).toBeNull()
  })

  it('uses in-memory cache for pinned versions', async () => {
    const fetchMock = vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('data.jsdelivr.com') && url.includes('@v1.4.0/flat')) {
        return jsonResponse(flatIndex(['docs/Getting Started/en_US/Overview.md'])) as unknown as Response
      }

      if (url.includes('cdn.jsdelivr.net') && url.includes('@v1.4.0/docs/Getting%20Started/en_US/Overview.md')) {
        return textResponse('# Cached once') as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    await fetchRemoteDocsBundle('1.4.0', 'en_US')
    await fetchRemoteDocsBundle('1.4.0', 'en_US')

    const flatCalls = fetchMock.mock.calls.filter(([input]) => String(input).includes('@v1.4.0/flat'))
    expect(flatCalls).toHaveLength(1)
  })
})
