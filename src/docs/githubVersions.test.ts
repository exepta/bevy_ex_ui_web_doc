import { afterEach, describe, expect, it, vi } from 'vitest'
import { fetchAvailableVersions } from './githubVersions'

type MockResponse = {
  ok: boolean
  status: number
  json: () => Promise<unknown>
}

function jsonResponse(payload: unknown): MockResponse {
  return {
    ok: true,
    status: 200,
    json: async () => payload,
  }
}

function errorResponse(status: number): MockResponse {
  return {
    ok: false,
    status,
    json: async () => ({}),
  }
}

describe('github versions', () => {
  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('keeps latest and adds only versions that contain docs', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.endsWith('/package/gh/exepta/bevy_extended_ui')) {
          return jsonResponse({ versions: ['1.4.2', '1.4.0', '1.3.0'] }) as unknown as Response
        }

        if (url.includes('@1.4.0/flat')) {
          return jsonResponse({ files: [{ name: '/docs/Getting Started/en_US/Overview.md' }] }) as unknown as Response
        }

        if (url.includes('@1.3.0/flat')) {
          return errorResponse(404) as unknown as Response
        }

        return errorResponse(404) as unknown as Response
      })

    const versions = await fetchAvailableVersions()
    expect(fetchMock).toHaveBeenCalled()
    expect(versions).toEqual(['1.4.2', '1.4.0'])
  })

  it('falls back to latest when GitHub is unavailable', async () => {
    vi.spyOn(globalThis, 'fetch').mockRejectedValue(new Error('network error'))

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2'])
  })

  it('falls back to latest when versions endpoint returns non-OK', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(500) as unknown as Response)

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2'])
  })

  it('falls back to latest when docs check returns non-404 error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/package/gh/exepta/bevy_extended_ui')) {
        return jsonResponse({ versions: ['1.4.1', '1.4.0'] }) as unknown as Response
      }

      return errorResponse(500) as unknown as Response
    })

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2'])
  })

  it('normalizes, filters and deduplicates versions', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/package/gh/exepta/bevy_extended_ui')) {
        return jsonResponse({
          versions: ['1.4.2', 'v1.4.0', '1.4.0', '1.4.0-beta.1', 'foo'],
        }) as unknown as Response
      }

      if (url.includes('@1.4.0/flat')) {
        return jsonResponse({ files: [{ name: '/docs/Getting Started/en_US/Overview.md' }] }) as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2', '1.4.0'])
  })

  it('uses highest published version as latest even if constant fallback is older', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.endsWith('/package/gh/exepta/bevy_extended_ui')) {
        return jsonResponse({
          versions: ['1.4.3', '1.4.2', '1.4.1'],
        }) as unknown as Response
      }

      if (url.includes('@1.4.2/flat')) {
        return jsonResponse({ files: [{ name: '/docs/Getting Started/en_US/Overview.md' }] }) as unknown as Response
      }

      if (url.includes('@1.4.1/flat')) {
        return errorResponse(404) as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.3', '1.4.2'])
  })
})
