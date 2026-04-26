import { createHash } from 'node:crypto'
import { mkdir, readFile, readdir, stat, writeFile } from 'node:fs/promises'
import path from 'node:path'

const projectRoot = process.cwd()
const sourceRoot = path.join(projectRoot, 'demo/raw-html-file')
const publicRoot = path.join(projectRoot, 'public')
const mirrorRoot = path.join(publicRoot, 'assets/site-mirror')
const manifestPath = path.join(mirrorRoot, 'manifest.json')

const allowedHosts = new Set([
  'static.wixstatic.com',
  'static.parastorage.com',
  'video.wixstatic.com',
  'mioniel-wixsite-com.filesusr.com',
])

const sourceFilePattern = /\.(html|json)$/i
const urlPattern = /https?:\/\/[^\s"'<>]+|\/\/[^\s"'<>]+/g
const cssUrlPattern = /url\(([^)]+)\)/g
const cssImportPattern = /@import\s+(?:url\()?['"]?([^'")]+)['"]?\)?/g
const ignoredPrefixes = ['data:', 'blob:', '#', 'about:', 'javascript:']
const requestTimeoutMs = 20000

const manifest = {}
const downloaded = new Map()
const cssFiles = new Set()
const failures = []

const toPosix = (value) => value.split(path.sep).join('/')

const hashText = (value) => createHash('sha1').update(value).digest('hex').slice(0, 10)

const isIgnoredUrl = (value) => ignoredPrefixes.some((prefix) => value.startsWith(prefix))

const trimUrlCandidate = (value) => {
  let next = value.trim().replace(/^['"]|['"]$/g, '')

  while (next) {
    const lastCharacter = next.at(-1)

    if (lastCharacter === ';' || lastCharacter === ',') {
      next = next.slice(0, -1)
      continue
    }

    if (lastCharacter === ')') {
      const openingParentheses = [...next].filter((character) => character === '(').length
      const closingParentheses = [...next].filter((character) => character === ')').length

      if (closingParentheses > openingParentheses) {
        next = next.slice(0, -1)
        continue
      }
    }

    break
  }

  return next
}

const normalizeUrl = (value, baseUrl = null) => {
  const trimmed = trimUrlCandidate(value)
  if (!trimmed || isIgnoredUrl(trimmed)) {
    return null
  }

  try {
    const normalized = trimmed.startsWith('//') ? `https:${trimmed}` : trimmed
    const resolved = baseUrl ? new URL(normalized, baseUrl) : new URL(normalized)
    resolved.hash = ''
    return resolved
  } catch {
    return null
  }
}

const isMirrorCandidate = (url) => allowedHosts.has(url.hostname)
const isLikelyStaticAsset = (url) => {
  if (!isMirrorCandidate(url)) {
    return false
  }

  if (url.pathname.endsWith('/') || url.pathname === '/media' || url.pathname === '/shapes' || url.pathname.endsWith('/open')) {
    return false
  }

  const decodedUrl = decodeURIComponent(url.toString())
  if (decodedUrl.includes('${') || decodedUrl.includes('`')) {
    return false
  }

  return true
}

const collectSourceFiles = async (dir) => {
  const entries = await readdir(dir, { withFileTypes: true })
  const files = []

  for (const entry of entries) {
    const absolutePath = path.join(dir, entry.name)

    if (entry.isDirectory()) {
      files.push(...(await collectSourceFiles(absolutePath)))
      continue
    }

    if (sourceFilePattern.test(entry.name)) {
      files.push(absolutePath)
    }
  }

  return files
}

const extractAbsoluteUrls = (content, baseUrl = null) => {
  const urls = new Set()
  const matches = content.match(urlPattern) ?? []

  for (const match of matches) {
    const normalized = normalizeUrl(match, baseUrl)
    if (normalized && isLikelyStaticAsset(normalized)) {
      urls.add(normalized.toString())
    }
  }

  return urls
}

const extractCssDependencyUrls = (content, cssUrl) => {
  const urls = new Set()

  for (const regex of [cssUrlPattern, cssImportPattern]) {
    regex.lastIndex = 0

    for (const match of content.matchAll(regex)) {
      const candidate = match[1]?.trim().replace(/^['"]|['"]$/g, '')
      const normalized = normalizeUrl(candidate, cssUrl)

      if (normalized && isLikelyStaticAsset(normalized)) {
        urls.add(normalized.toString())
      }
    }
  }

  return urls
}

const buildLocalAssetPath = (url) => {
  const pathname = decodeURIComponent(url.pathname)
  const extname = path.extname(pathname)
  const dirname = path.dirname(pathname)
  const basename = path.basename(pathname, extname || '')
  const querySuffix = url.search ? `__q_${hashText(url.search)}` : ''
  const filename = extname ? `${basename}${querySuffix}${extname}` : `${basename || 'index'}${querySuffix}.bin`
  const relativePath = toPosix(path.join('assets/site-mirror', url.hostname, dirname, filename))

  return {
    relativePath,
    absolutePath: path.join(publicRoot, relativePath),
    publicPath: `/${relativePath}`,
  }
}

const ensureDir = async (absolutePath) => {
  await mkdir(path.dirname(absolutePath), { recursive: true })
}

const downloadAsset = async (urlString) => {
  if (downloaded.has(urlString)) {
    return downloaded.get(urlString)
  }

  const task = (async () => {
    const url = new URL(urlString)
    const target = buildLocalAssetPath(url)

    const response = await fetch(url, { signal: AbortSignal.timeout(requestTimeoutMs) })
    if (!response.ok) {
      throw new Error(`HTTP ${response.status}`)
    }

    const arrayBuffer = await response.arrayBuffer()
    await ensureDir(target.absolutePath)
    await writeFile(target.absolutePath, Buffer.from(arrayBuffer))

    manifest[urlString] = target.publicPath

    const contentType = response.headers.get('content-type') ?? ''
    if (contentType.includes('text/css') || target.absolutePath.endsWith('.css')) {
      cssFiles.add(urlString)
    }

    return target
  })().catch((error) => {
    failures.push({ url: urlString, error: String(error) })
    return null
  })

  downloaded.set(urlString, task)
  return task
}

const mirrorFromSources = async () => {
  const files = await collectSourceFiles(sourceRoot)
  const queue = new Set()

  for (const file of files) {
    const content = await readFile(file, 'utf8')

    for (const url of extractAbsoluteUrls(content)) {
      queue.add(url)
    }
  }

  const pending = [...queue]

  for (let index = 0; index < pending.length; index += 1) {
    const url = pending[index]
    await downloadAsset(url)

    if (!cssFiles.has(url)) {
      continue
    }

    const downloadedTarget = await downloaded.get(url)
    if (!downloadedTarget) {
      continue
    }

    const cssContent = await readFile(downloadedTarget.absolutePath, 'utf8')
    const nestedUrls = extractCssDependencyUrls(cssContent, url)

    for (const nestedUrl of nestedUrls) {
      if (!queue.has(nestedUrl)) {
        queue.add(nestedUrl)
        pending.push(nestedUrl)
      }
    }
  }
}

const rewriteCssAssets = async () => {
  const entries = Object.entries(manifest)
  const manifestByAbsoluteUrl = new Map(entries)

  for (const cssUrl of cssFiles) {
    const publicPath = manifestByAbsoluteUrl.get(cssUrl)
    if (!publicPath) {
      continue
    }

    const cssFilePath = path.join(publicRoot, publicPath.slice(1))
    let cssContent = await readFile(cssFilePath, 'utf8')

    cssContent = cssContent.replaceAll(cssImportPattern, (fullMatch, rawUrl) => {
      const normalized = normalizeUrl(rawUrl, cssUrl)
      if (!normalized) {
        return fullMatch
      }

      const replacement = manifestByAbsoluteUrl.get(normalized.toString())
      if (!replacement) {
        return fullMatch
      }

      const relativeTarget = toPosix(path.relative(path.dirname(cssFilePath), path.join(publicRoot, replacement.slice(1))))
      return fullMatch.replace(rawUrl, relativeTarget.startsWith('.') ? relativeTarget : `./${relativeTarget}`)
    })

    cssContent = cssContent.replaceAll(cssUrlPattern, (fullMatch, rawUrl) => {
      const normalized = normalizeUrl(rawUrl, cssUrl)
      if (!normalized) {
        return fullMatch
      }

      const replacement = manifestByAbsoluteUrl.get(normalized.toString())
      if (!replacement) {
        return fullMatch
      }

      const relativeTarget = toPosix(path.relative(path.dirname(cssFilePath), path.join(publicRoot, replacement.slice(1))))
      return `url("${relativeTarget.startsWith('.') ? relativeTarget : `./${relativeTarget}`}")`
    })

    await writeFile(cssFilePath, cssContent)
  }
}

await mkdir(mirrorRoot, { recursive: true })
await mirrorFromSources()
await rewriteCssAssets()
await writeFile(
  manifestPath,
  `${JSON.stringify(
    {
      generatedAt: new Date().toISOString(),
      assetCount: Object.keys(manifest).length,
      failures,
      assets: manifest,
    },
    null,
    2,
  )}\n`,
)

console.log(
  JSON.stringify(
    {
      assetCount: Object.keys(manifest).length,
      cssCount: cssFiles.size,
      failureCount: failures.length,
      manifestPath: toPosix(path.relative(projectRoot, manifestPath)),
    },
    null,
    2,
  ),
)
