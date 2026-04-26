import type { ResolutionMethod } from '@wix/thunderbolt-ssr-api'
import type { Experiments } from '@wix/thunderbolt-symbols'
import { decodeUriComponentIfEncoded } from 'feature-router'

type UrlResolverParams = {
	url: URL
	baseUrl: string
	nextLanguageCode?: string
	currentLanguageCode: string
	nextResolutionMethod: ResolutionMethod
	currentResolutionMethod: ResolutionMethod
	currentPageUriSeo: string
	nextPageUriSeo: string
	experiments: Experiments
}

type ModifierMapper<T extends keyof UrlResolverParams> = {
	[key in ResolutionMethod]: (params: Pick<UrlResolverParams, T>) => void
}

const removalMapper: ModifierMapper<'url' | 'currentLanguageCode'> = {
	Subdomain: ({ url, currentLanguageCode }) => {
		url.hostname = url.hostname.replace(new RegExp(`^${currentLanguageCode}\\.`), 'www.')
	},
	QueryParam: ({ url }) => {
		url.searchParams.delete('lang')
	},
	Subdirectory: ({ url, currentLanguageCode }) => {
		/**
		 * match: mysite/en/my-page
		 * match: mysite/en
		 * don't match: mysite/english
		 */
		url.pathname = url.pathname.replace(new RegExp(`(/${currentLanguageCode})($|/)`), '$2')
	},
}

const addMapper: ModifierMapper<'url' | 'baseUrl' | 'nextLanguageCode'> = {
	Subdomain: ({ url, nextLanguageCode }) => {
		if (!nextLanguageCode) {
			return
		}
		url.hostname = url.hostname.replace('www', nextLanguageCode)
	},
	QueryParam: ({ url, nextLanguageCode }) => {
		if (!nextLanguageCode) {
			return
		}
		url.searchParams.set('lang', nextLanguageCode)
	},
	Subdirectory: ({ url, baseUrl, nextLanguageCode }) => {
		if (!nextLanguageCode) {
			return
		}

		const siteName = utils.getSiteName(baseUrl)

		const [, relativePath] = url.href.split(/[?|#]/)[0].split(`${baseUrl}/`)
		url.pathname = [siteName, nextLanguageCode, relativePath].filter(Boolean).join('/')
	},
}

const utils = {
	getSiteName: (baseUrl: string) => utils.removeTralingSlash(new URL(baseUrl).pathname),
	removeTralingSlash: (path: string) => path.replace(/\/$/, ''),
}

const removeCurrentLanguageIndiction = (
	url: URL,
	currentLanguageCode: string,
	currentResolutionMethod: ResolutionMethod
) => {
	removalMapper[currentResolutionMethod]({ url, currentLanguageCode })
}

const addLanguageIndication = (
	url: URL,
	baseUrl: string,
	nextResolutionMethod: ResolutionMethod,
	nextLanguageCode?: string
) => {
	addMapper[nextResolutionMethod]({ url, baseUrl, nextLanguageCode })
}

const getNextUrlByLang = (
	currentPageUriSEO: string,
	href: string,
	nextPageUriSeo: string,
	shouldSkipDecodeUri: boolean | string | undefined
) => {
	if (nextPageUriSeo !== 'home') {
		const url = new URL(href)
		url.pathname = shouldSkipDecodeUri
			? url.pathname.replace(currentPageUriSEO, nextPageUriSeo)
			: decodeURIComponent(url.pathname).replace(currentPageUriSEO, nextPageUriSeo)
		return url.href
	}
	return href
}

// This regex matches any character with a code point above 127 (non-ASCII)
const isContainingNonAsciiChars = (slug: string) => slug && [...slug].some((char) => char.charCodeAt(0) > 127)

const resolveUriSlugs = (shouldEncodeSlugsOnDecodeSkip: boolean, currentUriSlug: string, nextUriSlug: string) => {
	// In case we don't skip the encodeURI logic, the url.href already got decoded and will match the slugs format, so we can exit early
	if (!shouldEncodeSlugsOnDecodeSkip) {
		return {
			currentUriSlug,
			nextUriSlug,
		}
	}
	// If we skip the decode logic, we need to check if the slugs contain non-ASCII characters, in that case we need to encode them to match the url.pathname
	// format when we generate the next page URL, otherwise we will have a mismatch between the slugs and the url.pathname string
	return {
		currentUriSlug: isContainingNonAsciiChars(currentUriSlug) ? encodeURIComponent(currentUriSlug) : currentUriSlug,
		nextUriSlug: isContainingNonAsciiChars(nextUriSlug) ? encodeURIComponent(nextUriSlug) : nextUriSlug,
	}
}

export const resolveLanguageUrl = ({
	url,
	baseUrl,
	nextLanguageCode,
	currentLanguageCode,
	nextResolutionMethod,
	currentResolutionMethod,
	currentPageUriSeo,
	nextPageUriSeo,
	experiments,
}: UrlResolverParams) => {
	const shouldSkipDecodeUri = Boolean(experiments['specs.thunderbolt.skipDecodeUri'])
	const { currentUriSlug, nextUriSlug } = resolveUriSlugs(shouldSkipDecodeUri, currentPageUriSeo, nextPageUriSeo)
	const decodedUrl = shouldSkipDecodeUri ? url.href : decodeUriComponentIfEncoded(url.href)
	const nextUrl = getNextUrlByLang(currentUriSlug, decodedUrl, nextUriSlug, shouldSkipDecodeUri)

	const cloneUrl = new URL(nextUrl)

	const baseUrlWithoutLang = getCleanBaseUrl({ baseUrl, currentLanguageCode })
	removeCurrentLanguageIndiction(cloneUrl, currentLanguageCode, currentResolutionMethod)
	addLanguageIndication(cloneUrl, baseUrlWithoutLang, nextResolutionMethod, nextLanguageCode)
	return cloneUrl.toString()
}

const getCleanBaseUrl = ({
	baseUrl,
	currentLanguageCode,
}: Pick<UrlResolverParams, 'baseUrl' | 'currentLanguageCode'>) => {
	const cleanBaseUrl = new URL(baseUrl)
	Object.values(removalMapper).forEach((remove) =>
		remove({
			url: cleanBaseUrl,
			currentLanguageCode,
		})
	)
	return utils.removeTralingSlash(cleanBaseUrl.toString())
}
