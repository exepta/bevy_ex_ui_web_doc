const DYNAMIC_WASM_BASE_IFRAME_SRC = '/examples/base/'
const BASE_URL_PLACEHOLDER_PATTERN = /\{base\.url\}/gi

export type WasmExample = {
  id: string
  iframeSrc: string
  html: string
  css: string
}

export type WasmExamplesByCategory = Map<string, Map<string, WasmExample>>

const IFRAME_TAG_PATTERN = /<iframe\b[^>]*>/gi

function toTrimmedString(value: unknown) {
  if (typeof value !== 'string') {
    return ''
  }

  return value.trim()
}

function toWasmExamplesArray(value: unknown): unknown[] {
  if (!value || typeof value !== 'object') {
    return []
  }

  const payload = value as { category?: unknown }
  return Array.isArray(payload.category) ? payload.category : []
}

function normalizeDocName(value: string) {
  return value.replace(/^\d+[_\-\s]*/, '').replace(/[^a-zA-Z0-9]/g, '').toLowerCase()
}

function normalizeExampleMarkup(markup: string, exampleId: string) {
  const trimmed = markup.trim()
  if (!trimmed) {
    return `<div><headline>${exampleId}</headline><paragraph>No html configured in wasm_examples.json.</paragraph></div>`
  }

  return trimmed
    .replace(/(<img\b[^>]*\bsrc\s*=\s*["'])examples\/icons\//gi, '$1icons/')
    .replace(/(\bicon\s*=\s*["'])icons\//gi, '$1examples/icons/')
    .replace(/(<icon\b[^>]*\bsrc\s*=\s*["'])icons\//gi, '$1examples/icons/')
    .replace(/(\bicon\s*=\s*["'])\{\s*custom\.png\s*\}(["'])/gi, '$1examples/icons/custom.png$2')
    .replace(/(<icon\b[^>]*\bsrc\s*=\s*["'])\{\s*custom\.png\s*\}(["'])/gi, '$1examples/icons/custom.png$2')
    .replace(/(\bsrc\s*=\s*["'])\{\s*custom\.png\s*\}(["'])/gi, '$1icons/custom.png$2')
    .replace(/(\bicon\s*=\s*["'])\{\s*example_image\s*\}(["'])/gi, '$1examples/bevy.png$2')
    .replace(/(<icon\b[^>]*\bsrc\s*=\s*["'])\{\s*example_image\s*\}(["'])/gi, '$1examples/bevy.png$2')
    .replace(/(\bsrc\s*=\s*["'])\{\s*example_image\s*\}(["'])/gi, '$1bevy.png$2')
    .replace(/\{\s*custom\.png\s*\}/gi, 'icons/custom.png')
    .replace(/\{\s*example_image\s*\}/gi, 'bevy.png')
}

function escapeHtmlAttribute(value: string) {
  return value.replace(/&/g, '&amp;').replace(/"/g, '&quot;')
}

function readHtmlAttr(tag: string, name: string) {
  const match = new RegExp(`\\b${name}\\s*=\\s*(["'])(.*?)\\1`, 'i').exec(tag)
  return match?.[2] ?? null
}

function upsertHtmlAttr(tag: string, name: string, value: string) {
  const escaped = escapeHtmlAttribute(value)
  const pattern = new RegExp(`\\b${name}\\s*=\\s*(["']).*?\\1`, 'i')

  if (pattern.test(tag)) {
    return tag.replace(pattern, `${name}="${escaped}"`)
  }

  return tag.replace(/\s*\/?>$/, (suffix) => ` ${name}="${escaped}"${suffix}`)
}

function resolveRuntimeBaseUrl() {
  const base = import.meta.env.BASE_URL ?? '/'
  return base.endsWith('/') ? base.slice(0, -1) : base
}

function resolveIframeTargetSrc(iframeSrc: string) {
  const normalized = iframeSrc.trim()
  const runtimeBaseUrl = resolveRuntimeBaseUrl()

  if (!normalized) {
    return `${runtimeBaseUrl}${DYNAMIC_WASM_BASE_IFRAME_SRC}`
  }

  const withBaseUrl = normalized.replace(BASE_URL_PLACEHOLDER_PATTERN, runtimeBaseUrl)
  const looksLikeLegacyStaticExample = /\/examples\/(?!base(?:\/|$))[^/?#]+/i.test(withBaseUrl)
  if (looksLikeLegacyStaticExample) {
    return `${runtimeBaseUrl}${DYNAMIC_WASM_BASE_IFRAME_SRC}`
  }

  const localAbsoluteMatch = /^https?:\/\/(?:localhost|127\.0\.0\.1)(?::\d+)?(\/examples\/[^\s"'<>]*)$/i.exec(withBaseUrl)
  if (localAbsoluteMatch) {
    return `${runtimeBaseUrl}${localAbsoluteMatch[1]}`
  }

  return withBaseUrl
}

function ensureExamplesDirectorySlash(value: string) {
  try {
    const parsed = new URL(value, 'http://example.local')
    if (/^\/examples\/[^/?#]+$/.test(parsed.pathname)) {
      parsed.pathname = `${parsed.pathname}/`
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // keep original value
  }
  return value
}

function toRelativeExamplesUrl(url: string) {
  try {
    const parsed = new URL(url, 'http://example.local')
    if (parsed.pathname.startsWith('/examples/')) {
      return `${parsed.pathname}${parsed.search}${parsed.hash}`
    }
  } catch {
    // keep original value
  }
  return url
}

function normalizeCssCommandsForQuery(value: string) {
  return value
    .split(',')
    .map((token) => token.trim())
    .filter(Boolean)
    .join(',')
}

function buildDynamicIframeSrc(example: WasmExample) {
  const params = new URLSearchParams()
  params.set('example', example.id)
  params.set('html', normalizeExampleMarkup(example.html, example.id))
  params.set('css', normalizeCssCommandsForQuery(example.css))
  if (example.iframeSrc) {
    params.set('iframe_src', example.iframeSrc)
  }

  const target = ensureExamplesDirectorySlash(resolveIframeTargetSrc(example.iframeSrc))
  const separator = target.includes('?') ? '&' : '?'
  return toRelativeExamplesUrl(`${target}${separator}${params.toString()}`)
}

export function parseWasmExamplesByCategory(payload: unknown): WasmExamplesByCategory {
  const categories = new Map<string, Map<string, WasmExample>>()

  for (const categoryEntry of toWasmExamplesArray(payload)) {
    const categoryPayload =
      categoryEntry && typeof categoryEntry === 'object' ? (categoryEntry as Record<string, unknown>) : {}
    const categoryName = normalizeDocName(toTrimmedString(categoryPayload.name))
    if (!categoryName) {
      continue
    }

    const examplesRaw = Array.isArray(categoryPayload.examples) ? categoryPayload.examples : []
    const byId = new Map<string, WasmExample>()

    for (const [index, exampleRaw] of examplesRaw.entries()) {
      const examplePayload = exampleRaw && typeof exampleRaw === 'object' ? (exampleRaw as Record<string, unknown>) : {}
      const id = toTrimmedString(examplePayload.id) || `example_${index + 1}`
      if (!id) {
        continue
      }

      byId.set(id, {
        id,
        iframeSrc: toTrimmedString(examplePayload.iframe_src),
        html: toTrimmedString(examplePayload.html),
        css: toTrimmedString(examplePayload.css),
      })
    }

    categories.set(categoryName, byId)
  }

  return categories
}

export function applyWasmExamplesToMarkdown(
  markdownSource: string,
  docKey: string,
  wasmExamplesByCategory: WasmExamplesByCategory,
) {
  const entry = docKey.split('/').at(-1) ?? ''
  const docCategoryName = normalizeDocName(entry)
  if (!docCategoryName) {
    return markdownSource
  }

  const byIframeId = wasmExamplesByCategory.get(docCategoryName)
  if (!byIframeId || byIframeId.size === 0) {
    return markdownSource
  }

  return markdownSource.replace(IFRAME_TAG_PATTERN, (tag) => {
    const iframeId = toTrimmedString(readHtmlAttr(tag, 'id'))
    if (!iframeId) {
      return tag
    }

    const example = byIframeId.get(iframeId)
    if (!example) {
      return tag
    }

    return upsertHtmlAttr(tag, 'src', buildDynamicIframeSrc(example))
  })
}
