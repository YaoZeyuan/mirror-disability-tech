/**
 * Checks if two URLs are the same except for query parameters and hash
 * @param currentUrl - The current URL string
 * @param targetUrl - The target URL string
 * @returns true if URLs are the same except for query params/hash, false otherwise
 */
export const isSameUrlExceptQuery = (currentUrl: string, targetUrl: string): boolean => {
	try {
		const currentUrlObj = new URL(currentUrl)
		const targetUrlObj = new URL(targetUrl, currentUrlObj.origin)

		// Compare URLs without search params and hash
		const currentUrlWithoutQuery = currentUrlObj.origin + currentUrlObj.pathname
		const targetUrlWithoutQuery = targetUrlObj.origin + targetUrlObj.pathname

		return currentUrlWithoutQuery === targetUrlWithoutQuery
	} catch {
		// If URL parsing fails, assume they're different
		return false
	}
}
