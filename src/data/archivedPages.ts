export type ArchivedPageKey =
  | 'hiddenfigures'
  | 'hiddenfigures2'
  | 'openfutures'
  | 'teams'
  | 'unrestrictedbodyminds'

export const archivedPageTitles: Record<ArchivedPageKey, string> = {
  hiddenfigures: '隐藏人物 I',
  hiddenfigures2: '隐藏人物 II',
  openfutures: '开源未来',
  teams: '策展团队',
  unrestrictedbodyminds: '无限身心',
}

type AssetMirrorManifest = {
  assets?: Record<string, string>
}

const originalSiteBaseUrl = 'https://mioniel.wixsite.com/disability-tech'

const internalRouteMap = new Map<string, string>([
  [`${originalSiteBaseUrl}`, '/'],
  [`${originalSiteBaseUrl}/`, '/'],
  [`${originalSiteBaseUrl}/hiddenfigures`, '/hiddenfigures'],
  [`${originalSiteBaseUrl}/hiddenfigures2`, '/hiddenfigures2'],
  [`${originalSiteBaseUrl}/openfutures`, '/openfutures'],
  [`${originalSiteBaseUrl}/teams`, '/teams'],
  [`${originalSiteBaseUrl}/unrestrictedbodyminds`, '/unrestrictedbodyminds'],
])

let assetMirrorManifestPromise: Promise<AssetMirrorManifest> | null = null

const loadAssetMirrorManifest = async () => {
  if (!assetMirrorManifestPromise) {
    assetMirrorManifestPromise = fetch('/assets/site-mirror/manifest.json')
      .then((response) => (response.ok ? response.json() : { assets: {} }))
      .catch(() => ({ assets: {} }))
  }

  return assetMirrorManifestPromise
}

const archivedPageLoaders: Record<ArchivedPageKey, () => Promise<string>> = {
  hiddenfigures: async () =>
    (await import('../../demo/raw-html-file/pages/hiddenfigures/hiddenfigures.html?raw')).default,
  hiddenfigures2: async () =>
    (await import('../../demo/raw-html-file/pages/hiddenfigures2/hiddenfigures2.html?raw')).default,
  openfutures: async () =>
    (await import('../../demo/raw-html-file/pages/openfutures/openfutures.html?raw')).default,
  teams: async () => (await import('../../demo/raw-html-file/pages/teams/teams.html?raw')).default,
  unrestrictedbodyminds: async () =>
    (await import('../../demo/raw-html-file/pages/unrestrictedbodyminds/unrestrictedbodyminds.html?raw')).default,
}

const injectHeightBridge = (html: string) => {
  const bridgeScript = `
<script>
  (function () {
    var postHeight = function () {
      var nextHeight = Math.max(
        document.documentElement ? document.documentElement.scrollHeight : 0,
        document.body ? document.body.scrollHeight : 0
      )
      parent.postMessage({ type: 'archived-page-height', height: nextHeight }, '*')
    }
    window.addEventListener('load', function () {
      postHeight()
      setTimeout(postHeight, 250)
      setTimeout(postHeight, 1000)
    })
    window.addEventListener('resize', postHeight)
    new MutationObserver(postHeight).observe(document.documentElement, {
      attributes: true,
      childList: true,
      subtree: true,
    })
  })()
</script>`

  return html.replace('</body>', `${bridgeScript}\n</body>`)
}

const rewriteInternalLinks = (html: string) => {
  let next = html

  for (const [from, to] of internalRouteMap) {
    next = next.split(`href="${from}"`).join(`href="${to}"`)
    next = next.split(`href="${from}/"`).join(`href="${to}"`)
  }

  return next
}

const normalizeArchivedHtml = (html: string) => injectHeightBridge(rewriteInternalLinks(html))

export const loadArchivedPageDocument = async (key: ArchivedPageKey) => {
  const html = await archivedPageLoaders[key]()
  const normalizedHtml = normalizeArchivedHtml(html)
  const manifest = await loadAssetMirrorManifest()
  const assets = manifest.assets ?? {}

  return Object.entries(assets).reduce((accumulator, [remoteUrl, localUrl]) => {
    const protocolLess = remoteUrl.replace(/^https:/, '')
    const escapedRemoteUrl = remoteUrl.split('/').join('\\/')
    const escapedProtocolLess = protocolLess.split('/').join('\\/')

    return accumulator
      .split(remoteUrl)
      .join(localUrl)
      .split(protocolLess)
      .join(localUrl)
      .split(escapedRemoteUrl)
      .join(localUrl)
      .split(escapedProtocolLess)
      .join(localUrl)
  }, normalizedHtml)
}
