const REPO_OWNER = 'exepta'
const REPO_NAME = 'bevy_extended_ui'
const JSDELIVR_PACKAGE_API_URL = `https://data.jsdelivr.com/v1/package/gh/${REPO_OWNER}/${REPO_NAME}`
const JSDELIVR_FLAT_API_BASE_URL = `${JSDELIVR_PACKAGE_API_URL}@`
const STABLE_VERSION_PATTERN = /^\d+\.\d+\.\d+$/
const BETA_VERSION_PATTERN = /^\d+\.\d+\.\d+(?:\.|-)(?:beta)\.\d+$/i

type FetchVersionsOptions = {
  includeBeta?: boolean
}

function normalizeVersionName(version: string) {
  return version.replace(/^v/i, '')
}

function isStableVersion(version: string) {
  return STABLE_VERSION_PATTERN.test(version)
}

function isBetaVersion(version: string) {
  return BETA_VERSION_PATTERN.test(version)
}

function isAllowedVersion(version: string, includeBeta: boolean) {
  return isStableVersion(version) || (includeBeta && isBetaVersion(version))
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
  const stableMatch = version.match(/^(\d+)\.(\d+)\.(\d+)$/)
  if (stableMatch) {
    return {
      major: Number.parseInt(stableMatch[1], 10),
      minor: Number.parseInt(stableMatch[2], 10),
      patch: Number.parseInt(stableMatch[3], 10),
      beta: null as number | null,
    }
  }

  const betaMatch = version.match(/^(\d+)\.(\d+)\.(\d+)(?:\.|-)(?:beta)\.(\d+)$/i)
  if (betaMatch) {
    return {
      major: Number.parseInt(betaMatch[1], 10),
      minor: Number.parseInt(betaMatch[2], 10),
      patch: Number.parseInt(betaMatch[3], 10),
      beta: Number.parseInt(betaMatch[4], 10),
    }
  }

  return {
    major: 0,
    minor: 0,
    patch: 0,
    beta: null as number | null,
  }
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

  if (left.patch !== right.patch) {
    return right.patch - left.patch
  }

  if (left.beta === null && right.beta !== null) {
    return -1
  }

  if (left.beta !== null && right.beta === null) {
    return 1
  }

  if (left.beta === null && right.beta === null) {
    return 0
  }

  return (right.beta ?? 0) - (left.beta ?? 0)
}

function sortVersionsDesc(versions: string[]) {
  return [...versions].sort(compareSemverDesc)
}

async function fetchPublishedVersions(includeBeta: boolean) {
  const response = await fetch(JSDELIVR_PACKAGE_API_URL)
  if (!response.ok) {
    throw new Error(`jsDelivr versions request failed: ${response.status}`)
  }

  const payload = (await response.json()) as { versions?: string[] }
  return (payload.versions ?? [])
    .map((entry) => entry.trim())
    .filter((entry) => entry.length > 0)
    .map(normalizeVersionName)
    .filter((entry) => isAllowedVersion(entry, includeBeta))
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
      return Boolean(name?.startsWith('docs/'))
    })

    if (hasDocs) {
      return true
    }
  }

  return false
}

export async function fetchAvailableVersions(options?: FetchVersionsOptions) {
  const includeBeta = options?.includeBeta === true

  try {
    const publishedVersions = sortVersionsDesc(dedupeVersions(await fetchPublishedVersions(includeBeta)))
    if (publishedVersions.length === 0) {
      return []
    }

    const checks = await Promise.all(
      publishedVersions.map(async (version) => ({
        version,
        hasDocs: await hasDocsDirectory(version),
      })),
    )

    const versionsWithDocs = checks
      .filter((entry) => entry.hasDocs)
      .map((entry) => entry.version)

    if (versionsWithDocs.length === 0) {
      return []
    }

    return dedupeVersions(versionsWithDocs)
  } catch {
    return []
  }
}
