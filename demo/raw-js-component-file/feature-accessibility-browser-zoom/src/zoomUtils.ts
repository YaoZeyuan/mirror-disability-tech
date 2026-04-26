import type { BrowserWindow, ILogger } from '@wix/thunderbolt-symbols'
import {
	isMobileUserAgent,
	isIOSDevice,
	isIOSChrome,
	detectBrowserZoomForDesktop,
	hasInitialBrowserZoom,
	getInitialZoomInfo,
} from '@wix/thunderbolt-environment'
import type { FreezeMetrics } from './types'

/**
 * Check if zoom was already applied
 */
export const isZoomAlreadyApplied = (window: BrowserWindow): boolean => {
	return (window as any).zoomSpxFontApplied === true
}

/**
 * Check if browser zoom handling should be applied
 * Safari 18.5+ natively supports zooming for viewport units, so we exclude it
 * Chrome on iOS uses WebKit which handles zoom natively, so we exclude it too
 * Only apply for Chrome, Firefox, and mobile browsers
 * Also skip if we've already applied zoom handling via global zoom
 */
export const shouldApplyBrowserZoomHandling = (window: BrowserWindow): boolean => {
	if (!window?.navigator?.userAgent) {
		return false
	}

	// Skip if we've already applied zoom handling
	if (isZoomAlreadyApplied(window)) {
		return false
	}

	const userAgent = window.navigator.userAgent

	// Chrome on iOS uses WebKit which handles zoom natively -- skip
	if (isIOSChrome(userAgent)) {
		return false
	}

	const isFirefox = /firefox/i.test(userAgent)
	const isMobile = isMobileUserAgent(userAgent)
	const isChrome = userAgent.includes('Chrome')

	return isChrome || isMobile || isFirefox
}

const FONT_FREEZE_SELECTOR = 'body *:not(script):not(style):not(svg):not(path):not(g):not(defs):not(clipPath)'

/**
 * Query all DOM elements that support font-size styling
 */
const selectElementsToFreeze = (document: Document): NodeListOf<Element> => {
	return document.querySelectorAll(FONT_FREEZE_SELECTOR)
}

/**
 * Batch read computed styles for all elements to avoid layout thrashing
 */
const batchReadComputedStyles = (window: BrowserWindow, elements: NodeListOf<Element>): CSSStyleDeclaration[] => {
	const styles: CSSStyleDeclaration[] = []
	elements.forEach((element) => {
		styles.push(window!.getComputedStyle(element))
	})
	return styles
}

/**
 * Apply --browser-zoom CSS variable to document root
 */
const applyCssZoomVariable = (document: Document, zoomFactor: number): void => {
	document.documentElement.style.setProperty('--browser-zoom', zoomFactor.toFixed(2))
}

/**
 * Remove --browser-zoom CSS variable from document root
 */
const removeCssZoomVariable = (document: Document): void => {
	document.documentElement.style.removeProperty('--browser-zoom')
}

/**
 * Apply frozen font-size and line-height to elements
 * Returns count of elements with frozen font-size
 */
const applyFrozenStyles = (elements: NodeListOf<Element>, computedStyles: CSSStyleDeclaration[]): number => {
	let frozenCount = 0

	elements.forEach((element, i) => {
		const style = computedStyles[i]
		const fontSize = style.fontSize

		if (fontSize && fontSize !== '0px') {
			;(element as HTMLElement).style.fontSize = fontSize
			frozenCount++
		}

		const lineHeight = style.lineHeight
		if (lineHeight && lineHeight !== 'normal') {
			;(element as HTMLElement).style.lineHeight = lineHeight
		}
	})

	return frozenCount
}

/**
 * Report freeze metrics to FedOps or performance.mark()
 */
const reportFreezeMetrics = (metrics: FreezeMetrics, logger?: ILogger): void => {
	if (logger) {
		// Post-hydration: Report directly to FedOps
		logger.meter('freeze_fonts_for_browser_zoom', {
			paramsOverrides: {
				duration: String(metrics.duration),
				frozenElements: String(metrics.frozenElements),
				totalElements: String(metrics.totalElements),
				providedZoomFactor: metrics.providedZoomFactor ? String(metrics.providedZoomFactor) : '',
				devicePixelRatio: metrics.devicePixelRatio ? String(metrics.devicePixelRatio) : '',
				timestamp: String(metrics.timestamp),
				source: 'runtime',
			},
		})
	} else if (typeof performance !== 'undefined' && typeof performance.mark === 'function') {
		// Pre-hydration: Store in performance.mark() for later FedOps reporting
		performance.mark('browser-zoom-detector', {
			detail: {
				...metrics,
				source: 'browser_zoom_detector_pre_hydration',
			},
		})
	}
}

/**
 * Mark zoom font application status on window
 */
const markZoomFontApplied = (window: BrowserWindow, applied: boolean): void => {
	;(window as any).zoomSpxFontApplied = applied
}

/**
 * Reset zoom font applied flag — called on each page navigation so the new page gets frozen
 */
export const resetZoomFontApplied = (window: BrowserWindow): void => {
	;(window as any).zoomSpxFontApplied = false
}

/**
 * Handle errors during font freezing
 */
const handleFreezeError = (error: unknown, logger?: ILogger): void => {
	const errorMessage = `Failed to freeze fonts with zoom factor: ${
		error instanceof Error ? error.message : String(error)
	}`

	if (logger) {
		logger.captureError(error as Error, { tags: { feature: 'accessibility-browser-zoom' } })
	} else {
		console.error(errorMessage, error)
	}
}

/**
 * Freeze font-sizes with intelligent zoom handling
 *
 * Two scenarios:
 * 1. Pre-hydration (providedZoomFactor given): Applies --browser-zoom CSS variable temporarily
 *    to measure fonts at correct zoom level, since browser hasn't applied zoom yet.
 * 2. Runtime resize handlers (no providedZoomFactor): Reads current computed styles directly,
 *    since browser has already applied zoom.
 *
 * @param window - Browser window object
 * @param logger - Optional FedOps logger. If not provided, stores metrics in performance.mark()
 * @param providedZoomFactor - Optional pre-calculated zoom factor. When provided, triggers CSS variable approach.
 * @returns Number of elements with frozen font-size
 */
export const freezeFonts = (window: BrowserWindow, logger?: ILogger, providedZoomFactor?: number | null): number => {
	if (!window?.document) {
		return 0
	}

	const startTime = typeof performance !== 'undefined' ? performance.now() : Date.now()

	// Check if browser should apply zoom handling (exclude Safari)
	if (!shouldApplyBrowserZoomHandling(window)) {
		markZoomFontApplied(window, false)
		return 0
	}

	try {
		if (providedZoomFactor) {
			applyCssZoomVariable(window.document, providedZoomFactor)
		}

		const allElements = selectElementsToFreeze(window.document)
		const computedStyles = batchReadComputedStyles(window, allElements)

		if (providedZoomFactor) {
			removeCssZoomVariable(window.document)
		}

		const frozenCount = applyFrozenStyles(allElements, computedStyles)

		markZoomFontApplied(window, true)

		const duration = (typeof performance !== 'undefined' ? performance.now() : Date.now()) - startTime

		const visualViewport = (window as any).visualViewport
		reportFreezeMetrics(
			{
				frozenElements: frozenCount,
				totalElements: allElements.length,
				providedZoomFactor: providedZoomFactor ?? null,
				devicePixelRatio: window.devicePixelRatio ?? null,
				visualViewportScale: visualViewport?.scale ?? null,
				duration,
				timestamp: Date.now(),
			},
			logger
		)

		return frozenCount
	} catch (error) {
		handleFreezeError(error, logger)
		return 0
	}
}

/**
 * Listen for mobile zoom changes (fires callback once)
 * - iOS: Uses visualViewport resize events, fires when scale > 1
 * - Android: Always fires on resize (can't reliably detect baseline DPR on devices with DPR 2.6, 3.0, etc.)
 *
 * The iOS listener self-removes after the callback fires (not on the first event),
 * so filtered-out events (scale <= 1) don't consume the listener.
 */
const onMobileZoomDetected = (window: BrowserWindow, callback: () => void): (() => void) | null => {
	if (!window) {
		return null
	}

	if (window.navigator?.userAgent && isIOSDevice(window.navigator.userAgent)) {
		const visualViewport = (window as any).visualViewport
		if (visualViewport) {
			const handler = () => {
				if (visualViewport.scale <= 1) {
					return
				}
				callback()
				visualViewport.removeEventListener('resize', handler)
			}
			visualViewport.addEventListener('resize', handler)
			return () => visualViewport.removeEventListener('resize', handler)
		}
		return null
	}

	// Android: Resize events typically indicate Display Size or accessibility settings changes
	window.addEventListener('resize', callback, { once: true })
	return () => window.removeEventListener('resize', callback)
}

/**
 * Listen for desktop zoom changes using matchMedia for devicePixelRatio changes (fires callback once)
 */
const onDesktopZoomDetected = (window: BrowserWindow, callback: () => void): (() => void) | null => {
	if (!window) {
		return null
	}

	const dpr = window.devicePixelRatio || 1
	const mediaQuery = window.matchMedia(`(resolution: ${dpr}dppx)`)

	mediaQuery.addEventListener('change', callback, { once: true })
	return () => mediaQuery.removeEventListener('change', callback)
}

/**
 * Setup zoom listeners for runtime detection and freeze fonts when zoom is detected
 * Returns cleanup function to remove listeners
 */
export const setupBrowserZoomListener = (window: BrowserWindow, logger: ILogger): (() => void) | null => {
	if (!window) {
		return null
	}

	if (!shouldApplyBrowserZoomHandling(window)) {
		return null
	}

	const isMobile = window.navigator?.userAgent && isMobileUserAgent(window.navigator.userAgent)

	if (isMobile) {
		return onMobileZoomDetected(window, () => {
			if (!isZoomAlreadyApplied(window)) {
				freezeFonts(window, logger)
			}
		})
	}

	return onDesktopZoomDetected(window, () => {
		if (isZoomAlreadyApplied(window)) {
			return
		}
		const zoomFactor = detectBrowserZoomForDesktop(window.devicePixelRatio, window.innerWidth, window.outerWidth)
		if (zoomFactor > 1) {
			freezeFonts(window, logger)
		}
	})
}

/**
 * Apply font freeze if zoom is currently active and hasn't been applied yet.
 * Called on pageDidMount to handle SPA navigations where zoom persists across pages.
 * - iOS: reads visualViewport.scale directly
 * - Desktop: uses detectBrowserZoomForDesktop
 * - Android: cannot reliably detect initial zoom without a resize event — skipped
 */
export const applyZoomIfNeeded = (window: BrowserWindow, logger: ILogger): void => {
	if (!shouldApplyBrowserZoomHandling(window)) {
		return
	}

	const userAgent = window!.navigator?.userAgent || ''
	const isMobile = isMobileUserAgent(userAgent)

	if (isMobile) {
		if (isIOSDevice(userAgent)) {
			const visualViewport = (window as any).visualViewport
			const scale = visualViewport?.scale ?? 1
			if (scale > 1) {
				freezeFonts(window, logger, scale)
			}
		}
		return
	}

	const zoomFactor = detectBrowserZoomForDesktop(window!.devicePixelRatio, window!.innerWidth, window!.outerWidth)
	if (zoomFactor > 1) {
		freezeFonts(window, logger, zoomFactor)
	}
}

/**
 * Add BI reporting for browser zoom detection during session
 * Uses shared hasInitialBrowserZoom + getInitialZoomInfo for consistent detection
 * Returns cleanup function to prevent MediaQueryList garbage collection
 */
export const addBiForBrowserZoom = (window: BrowserWindow, logger: ILogger): (() => void) | null => {
	if (!logger || !window) {
		return null
	}

	const zoomParams = {
		userAgent: window.navigator?.userAgent || '',
		devicePixelRatio: window.devicePixelRatio || 1,
		innerWidth: window.innerWidth,
		outerWidth: window.outerWidth,
		visualViewportScale: (window as any).visualViewport?.scale,
	}
	const hasInitialZoom = hasInitialBrowserZoom(zoomParams)
	const isMobile = window.navigator?.userAgent && isMobileUserAgent(window.navigator.userAgent)

	const sendBi = () => {
		const infoInitialZoom = getInitialZoomInfo(window)
		const customParams: Record<string, string> = {
			hasInitialZoom: String(hasInitialZoom),
			infoInitialZoom: JSON.stringify(infoInitialZoom),
			zoomDuringSession: 'true',
		}

		logger.interactionStarted('browser-zoom-during-session', { customParams })
		logger.interactionEnded('browser-zoom-during-session', { customParams })
	}

	if (isMobile) {
		return onMobileZoomDetected(window, sendBi)
	}

	return onDesktopZoomDetected(window, sendBi)
}
