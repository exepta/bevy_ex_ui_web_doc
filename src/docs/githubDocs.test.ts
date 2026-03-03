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
})
