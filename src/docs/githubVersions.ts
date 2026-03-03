import { latestVersion } from './catalog'

const REPO_OWNER = 'exepta'
const REPO_NAME = 'bevy_extended_ui'
const TAGS_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/tags`
const CONTENTS_API_URL = `https://api.github.com/repos/${REPO_OWNER}/${REPO_NAME}/contents`
const MAX_PAGES = 3
const TAGS_PER_PAGE = 100

function normalizeTagName(tag: string) {
  return tag.replace(/^v/i, '')
}

function buildFallbackVersions() {
  return [latestVersion]
}

async function fetchTagNames() {
  const allTags: string[] = []

  for (let page = 1; page <= MAX_PAGES; page += 1) {
    const response = await fetch(`${TAGS_API_URL}?per_page=${TAGS_PER_PAGE}&page=${page}`)
    if (!response.ok) {
      throw new Error(`GitHub tags request failed: ${response.status}`)
    }

    const tags = (await response.json()) as Array<{ name?: string }>
    const names = tags
      .map((tag) => tag.name?.trim())
      .filter((name): name is string => Boolean(name))

    allTags.push(...names)

    if (tags.length < TAGS_PER_PAGE) {
      break
    }
  }

  return allTags
}

async function hasDocsDirectory(tagName: string) {
  const response = await fetch(`${CONTENTS_API_URL}/docs?ref=${encodeURIComponent(tagName)}`)

  if (response.status === 404) {
    return false
  }

  if (!response.ok) {
    throw new Error(`GitHub docs check failed for ${tagName}: ${response.status}`)
  }

  return true
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

export async function fetchAvailableVersions() {
  try {
    const tags = await fetchTagNames()
    const checks = await Promise.all(
      tags.map(async (tag) => ({
        tag,
        hasDocs: await hasDocsDirectory(tag),
      })),
    )

    const versionsWithDocs = checks
      .filter((entry) => entry.hasDocs)
      .map((entry) => normalizeTagName(entry.tag))
      .filter((version) => version !== latestVersion)

    return dedupeVersions([latestVersion, ...versionsWithDocs])
  } catch {
    return buildFallbackVersions()
  }
}
