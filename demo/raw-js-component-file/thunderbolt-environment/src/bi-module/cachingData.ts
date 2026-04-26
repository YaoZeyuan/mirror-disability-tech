import type { CachingInfo } from '@wix/thunderbolt-symbols'

export type TimingEntry = { name: string; description: string }

export interface ServerTimingData {
	cache?: string
	varnish?: string
	microPop?: string
}

interface CacheValues {
	cache: string
	varnish: string
	microPop?: string
}

const UNKNOWN_VALUE = 'unknown'
const CACHE_SEPARATOR = ','

const extractServerTiming = (getTimingEntries: () => Array<TimingEntry>): ServerTimingData => {
	let serverTiming: Array<TimingEntry>
	try {
		serverTiming = getTimingEntries()
	} catch {
		serverTiming = []
	}

	const timingMap = serverTiming.reduce(
		(acc, entry) => {
			acc[entry.name] = entry.description
			return acc
		},
		{} as Record<string, string>
	)

	return {
		cache: timingMap['cache'],
		varnish: timingMap['varnish'],
		microPop: timingMap['dc'], // 'dc' maps to microPop
	}
}

const formatCachingString = (cache: string, varnish: string): string => {
	return `${cache || UNKNOWN_VALUE}${CACHE_SEPARATOR}${varnish || UNKNOWN_VALUE}`
}

const parseCookieCacheData = (cookie: string): CacheValues | null => {
	const match = cookie.match(
		/ssr-caching="?cache[,#]\s*desc=([\w-]+)(?:[,#]\s*varnish=(\w+))?(?:[,#]\s*dc[,#]\s*desc=([\w-]+))?(?:"|;|$)/
	)

	if (!match || !match.length) {
		return null
	}

	return {
		cache: match[1],
		varnish: match[2] || UNKNOWN_VALUE,
		microPop: match[3],
	}
}

const createCachingInfo = (values: CacheValues): CachingInfo => {
	const caching = formatCachingString(values.cache, values.varnish)
	return {
		caching,
		isCached: caching.includes('hit'),
		...(values.microPop ? { microPop: values.microPop } : {}),
	}
}

export const extractCachingData = (cookie: string, getTimingEntries: () => Array<TimingEntry>): CachingInfo => {
	// Try server-timing first if available
	const serverTimingData = extractServerTiming(getTimingEntries)
	if (serverTimingData.cache || serverTimingData.varnish) {
		return createCachingInfo({
			cache: serverTimingData.cache || UNKNOWN_VALUE,
			varnish: serverTimingData.varnish || UNKNOWN_VALUE,
			microPop: serverTimingData.microPop,
		})
	}

	// Fallback to cookie parsing
	const cookieData = parseCookieCacheData(cookie)
	if (cookieData) {
		return createCachingInfo(cookieData)
	}

	// Return default when no data available
	return {
		caching: UNKNOWN_VALUE,
		isCached: false,
	}
}
