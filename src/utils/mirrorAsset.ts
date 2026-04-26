const mirroredAssetHosts = new Set([
  'static.wixstatic.com',
  'static.parastorage.com',
  'video.wixstatic.com',
  'mioniel-wixsite-com.filesusr.com',
])

export const resolveMirroredAsset = (value: string) => {
  try {
    const normalizedValue = value.startsWith('//') ? `https:${value}` : value
    const url = new URL(normalizedValue)

    if (!mirroredAssetHosts.has(url.hostname)) {
      return value
    }

    return `/assets/site-mirror/${url.hostname}${decodeURIComponent(url.pathname)}`
  } catch {
    return value
  }
}
