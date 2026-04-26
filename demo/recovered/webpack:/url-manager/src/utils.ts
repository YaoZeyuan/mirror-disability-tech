export const getRelativeEncodedUrl = (url: string, baseUrl: string) =>
	getRelativeUrlData(url, baseUrl).relativeEncodedUrl

export const getRelativeUrlData = (
	url: string,
	baseUrl: string
): {
	relativePathnameParts: Array<string>
	relativeUrl: string
	relativeEncodedUrl: string
} => {
	const relativePathname = getRelativePathname(url, baseUrl)
	const relativePathnameParts = getPathnameDecodedParts(relativePathname)
	const relativeUrl = pathnamePartsToRelativeUrl(relativePathnameParts)
	const relativeEncodedUrl = pathnamePartsToRelativeUrl(getPathnameParts(relativePathname))

	return {
		relativePathnameParts,
		relativeUrl,
		relativeEncodedUrl,
	}
}

const getRelativePathname = (url: string, baseUrl: string): string => {
	const parsedUrl = new URL(url, `${baseUrl}/`)
	const parsedBaseUrl = new URL(baseUrl)

	return parsedUrl.pathname.replace(parsedBaseUrl.pathname, '')
}

const getPathnameDecodedParts = (relativePathname: string) => {
	const cleanPath = removeLeadingAndTrailingSlash(relativePathname)

	return decodeUriComponentIfEncoded(cleanPath).split('/')
}

const pathnamePartsToRelativeUrl = (pathnameParts: Array<string>): string => `./${pathnameParts.join('/')}`

const getPathnameParts = (relativePathname: string) => removeLeadingAndTrailingSlash(relativePathname).split('/')

const removeLeadingAndTrailingSlash = (str: string): string => /^\/?(.*?)\/?$/.exec(str)![1]

export const getRelativeUrl = (url: string, baseUrl: string) => getRelativeUrlData(url, baseUrl).relativeUrl

export const decodeUriComponentIfEncoded = (uriStr: string) => {
	try {
		return decodeURIComponent(uriStr)
	} catch (e) {
		return uriStr
	}
}
