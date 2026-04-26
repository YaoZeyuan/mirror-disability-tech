/**
 * Browser Zoom Detection Utilities
 *
 * These functions live here because inline script
 * entries like sendFedopsLoadStarted and handleBrowserZoom are bundled by rspack,
 * whose split-chunks config forcefully extracts any module with "thunderbolt-commons"
 * in its resolved path into a separate chunk. No-runtime inline entries cannot load
 * external chunks, so the code must reside in a safe package path.
 * This is temporary since we won't need it after we will stop using the zoom in BI events.
 */

const MOBILE_UA_REGEX = /Mobile|Android|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i
const IOS_UA_REGEX = /iPhone|iPad|iPod/i

export function isMobileUserAgent(userAgent: string): boolean {
	if (!userAgent) {
		return false
	}
	return MOBILE_UA_REGEX.test(userAgent)
}

export function isIOSDevice(userAgent: string): boolean {
	if (!userAgent) {
		return false
	}
	return IOS_UA_REGEX.test(userAgent)
}

export function isIOSChrome(userAgent: string): boolean {
	return isIOSDevice(userAgent) && userAgent.includes('Chrome')
}

export function detectRetinaScreen(dpr: number, innerWidth: number, outerWidth: number): 1 | 2 {
	if (!dpr || !innerWidth || !outerWidth) {
		return 1
	}
	return Math.trunc(dpr * innerWidth) <= outerWidth ? 1 : 2
}

export function detectBrowserZoomForDesktop(dpr: number, innerWidth: number, outerWidth: number): number {
	if (!dpr || !innerWidth || !outerWidth) {
		return 1
	}

	const displayDPR = detectRetinaScreen(dpr, innerWidth, outerWidth)
	if (!displayDPR) {
		return 1
	}

	if (dpr <= displayDPR) {
		return 1
	}

	return Math.round((dpr / displayDPR) * 100) / 100
}

type ZoomDetectionParams = {
	userAgent: string
	devicePixelRatio: number
	innerWidth: number
	outerWidth: number
	visualViewportScale?: number
}

export function hasInitialBrowserZoom(params: ZoomDetectionParams): boolean {
	const { userAgent, devicePixelRatio, innerWidth, outerWidth, visualViewportScale } = params

	const isMobile = isMobileUserAgent(userAgent)

	if (isMobile) {
		return isIOSDevice(userAgent) ? (visualViewportScale || 1) > 1 : false
	}

	return detectBrowserZoomForDesktop(devicePixelRatio, innerWidth, outerWidth) > 1
}

type ZoomInfoSource = {
	devicePixelRatio: number
	innerWidth: number
	outerWidth: number
	visualViewport?: { scale?: number } | null
}

export type InitialZoomInfo = {
	devicePixelRatio: number
	innerWidth: number
	outerWidth: number
	visualViewportScale?: number
}

export function getInitialZoomInfo(win: ZoomInfoSource): InitialZoomInfo {
	const scale = win.visualViewport?.scale
	return {
		devicePixelRatio: win.devicePixelRatio || 1,
		innerWidth: win.innerWidth,
		outerWidth: win.outerWidth,
		...(scale != null ? { visualViewportScale: scale } : {}),
	}
}
