import { latestVersion } from './catalog'

const REPO_OWNER = 'exepta'
const REPO_NAME = 'bevy_extended_ui'
const JSDELIVR_PACKAGE_API_URL = `https://data.jsdelivr.com/v1/package/gh/${REPO_OWNER}/${REPO_NAME}`
const JSDELIVR_FLAT_API_BASE_URL = `${JSDELIVR_PACKAGE_API_URL}@`

function normalizeVersionName(version: string) {
  return version.replace(/^v/i, '')
}

function isStableVersion(version: string) {
  return /^\d+\.\d+\.\d+$/.test(version)
}

function buildFallbackVersions() {
  return [latestVersion]
}

function dedupeVersions(versions: string[]) {
  const seen = new Set<string>()
  const next: string[] = []

  for (const version of versions) {
    if (!seen.has(version)) {
      seen.add(version)
      next.push(version)
    }
  }

  return next
}

function parseSemver(version: string) {
  const [major, minor, patch] = version.split('.').map((part) => Number.parseInt(part, 10))
  return { major, minor, patch }
}

function compareSemverDesc(a: string, b: string) {
  const left = parseSemver(a)
  const right = parseSemver(b)

  if (left.major !== right.major) {
    return right.major - left.major
  }

  if (left.minor !== right.minor) {
    return right.minor - left.minor
  }

  return right.patch - left.patch
}

function sortVersionsDesc(versions: string[]) {
  return [...versions].sort(compareSemverDesc)
}

async function fetchPublishedVersions() {
  const response = await fetch(JSDELIVR_PACKAGE_API_URL)
  if (!response.ok) {
    throw new Error(`jsDelivr versions request failed: ${response.status}`)
  }

  const payload = (await response.json()) as { versions?: string[] }
  return (payload.versions ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(normalizeVersionName)
    .filter(isStableVersion)
}

async function fetchFlatFilesForRef(ref: string) {
  const response = await fetch(`${JSDELIVR_FLAT_API_BASE_URL}${encodeURIComponent(ref)}/flat`)
  if (response.status === 404) {
    return null
  }

  if (!response.ok) {
    throw new Error(`jsDelivr flat request failed for ${ref}: ${response.status}`)
  }

  const payload = (await response.json()) as { files?: Array<{ name?: string }> }
  return payload.files ?? []
}

async function hasDocsDirectory(version: string) {
  const refCandidates = [version, `v${version}`]

  for (const ref of refCandidates) {
    const files = await fetchFlatFilesForRef(ref)
    if (!files) {
      continue
    }

    const hasDocs = files.some((entry) => {
      const name = entry.name?.startsWith('/') ? entry.name.slice(1) : entry.name
      return Boolean(name?.startsWith('docs/') && name.endsWith('.md'))
    })

    if (hasDocs) {
      return true
    }
  }

  return false
}

export async function fetchAvailableVersions() {
  try {
    const publishedVersions = sortVersionsDesc(dedupeVersions(await fetchPublishedVersions()))
    if (publishedVersions.length === 0) {
      return buildFallbackVersions()
    }

    const [latestPublished, ...remaining] = publishedVersions
    const checks = await Promise.all(
      remaining.map(async (version) => ({
        version,
        hasDocs: await hasDocsDirectory(version),
      })),
    )

    const versionsWithDocs = checks
      .filter((entry) => entry.hasDocs)
      .map((entry) => entry.version)

    return dedupeVersions([latestPublished, ...versionsWithDocs])
  } catch {
    return buildFallbackVersions()
  }
}
