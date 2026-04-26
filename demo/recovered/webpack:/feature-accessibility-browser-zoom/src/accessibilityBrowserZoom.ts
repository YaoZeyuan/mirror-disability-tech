import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IPageDidMountHandler,
	IPageDidUnmountHandler,
	ILogger,
	Experiments,
} from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, LoggerSymbol, ExperimentsSymbol, SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { setupBrowserZoomListener, applyZoomIfNeeded, isZoomAlreadyApplied, resetZoomFontApplied } from './zoomUtils'
import { name } from './symbols'
import type { AccessibilityBrowserZoomSiteConfig } from './types'

const accessibilityBrowserZoomFactory = (
	window: BrowserWindow,
	logger: ILogger,
	experiments: Experiments,
	siteConfig: AccessibilityBrowserZoomSiteConfig
): IPageDidMountHandler & IPageDidUnmountHandler => {
	let cleanupZoomListeners: (() => void) | null = null
	let handleZoomAfterHydration = false
	return {
		pageDidMount: () => {
			// Check experiments based on site flags
			const isBuilderEnabled = siteConfig.isBuilder && experiments['specs.thunderbolt.browserZoomHandler']
			const isStudioEnabled = siteConfig.isStudio && experiments['specs.thunderbolt.browserZoomHandlerStudio']
			const isEnabled = isBuilderEnabled || isStudioEnabled

			if (!isEnabled) {
				return
			}

			// Check if pre-hydration script already ran by looking for performance mark
			if (window && window.performance && typeof window.performance.getEntriesByName === 'function') {
				const preHydrationMarks = window.performance.getEntriesByName('browser-zoom-detector', 'mark')

				if (preHydrationMarks.length > 0) {
					const mark = preHydrationMarks[0] as PerformanceMark
					const detail = mark.detail

					if (detail) {
						// Pre-hydration already froze fonts - report the metrics
						logger.meter('freeze_fonts_for_browser_zoom', {
							paramsOverrides: {
								duration: detail.duration || 0,
								frozenElements: detail.frozenElements || 0,
								totalElements: detail.totalElements || 0,
								timestamp: detail.timestamp || Date.now(),
								source: detail.source || 'browser_zoom_detector_pre_hydration',
							},
						})

						// Clean up the performance mark
						window.performance.clearMarks('browser-zoom-detector')
					}
				}
			}

			// On SPA navigation (not first mount), reset so new page content gets frozen.
			// On first mount, pre-hydration may have already frozen fonts —
			// applyZoomIfNeeded respects the existing zoomSpxFontApplied flag.
			if (handleZoomAfterHydration) {
				resetZoomFontApplied(window)
			} else {
				handleZoomAfterHydration = true
			}

			applyZoomIfNeeded(window, logger)

			if (!cleanupZoomListeners && !isZoomAlreadyApplied(window)) {
				cleanupZoomListeners = setupBrowserZoomListener(window, logger)
			}
		},
		pageDidUnmount: () => {
			if (cleanupZoomListeners) {
				cleanupZoomListeners()
				cleanupZoomListeners = null
			}
		},
	}
}

export const AccessibilityBrowserZoom = withDependencies(
	[BrowserWindowSymbol, LoggerSymbol, ExperimentsSymbol, named(SiteFeatureConfigSymbol, name)] as const,
	accessibilityBrowserZoomFactory
)
