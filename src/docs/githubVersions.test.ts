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

  it('keeps latest and adds only tags that contain docs', async () => {
    const fetchMock = vi
      .spyOn(globalThis, 'fetch')
      .mockImplementation(async (input: RequestInfo | URL) => {
        const url = String(input)

        if (url.includes('/tags?')) {
          return jsonResponse([
            { name: 'v1.4.2' },
            { name: 'v1.4.0' },
            { name: 'v1.3.0' },
          ]) as unknown as Response
        }

        if (url.includes('ref=v1.4.2')) {
          return errorResponse(404) as unknown as Response
        }

        if (url.includes('ref=v1.4.0')) {
          return jsonResponse([{ name: 'Getting Started' }]) as unknown as Response
        }

        if (url.includes('ref=v1.3.0')) {
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

  it('falls back to latest when tags endpoint returns non-OK', async () => {
    vi.spyOn(globalThis, 'fetch').mockResolvedValue(errorResponse(500) as unknown as Response)

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2'])
  })

  it('falls back to latest when docs check returns non-404 error', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/tags?')) {
        return jsonResponse([{ name: 'v1.4.0' }]) as unknown as Response
      }

      return errorResponse(500) as unknown as Response
    })

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2'])
  })

  it('reads multiple tag pages and deduplicates versions', async () => {
    vi.spyOn(globalThis, 'fetch').mockImplementation(async (input: RequestInfo | URL) => {
      const url = String(input)

      if (url.includes('/tags?') && url.includes('page=1')) {
        return jsonResponse(
          Array.from({ length: 100 }, (_, index) => ({
            name: index === 0 ? 'v1.4.2' : index === 1 ? 'v1.4.0' : `v0.0.${index}`,
          })),
        ) as unknown as Response
      }

      if (url.includes('/tags?') && url.includes('page=2')) {
        return jsonResponse([{ name: 'v1.4.0' }]) as unknown as Response
      }

      if (url.includes('ref=v1.4.0')) {
        return jsonResponse([{ name: 'docs' }]) as unknown as Response
      }

      return errorResponse(404) as unknown as Response
    })

    await expect(fetchAvailableVersions()).resolves.toEqual(['1.4.2', '1.4.0'])
  })
})
