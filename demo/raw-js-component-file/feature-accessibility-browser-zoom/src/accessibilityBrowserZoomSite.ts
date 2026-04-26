import { withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IAppDidMountHandler,
	IAppWillUnmountHandler,
	Experiments,
	ILogger,
} from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, ExperimentsSymbol, LoggerSymbol } from '@wix/thunderbolt-symbols'
import { addBiForBrowserZoom } from './zoomUtils'

const accessibilityBrowserZoomSiteFactory = (
	window: BrowserWindow,
	experiments: Experiments,
	logger: ILogger
): IAppDidMountHandler & IAppWillUnmountHandler => {
	let cleanupBiListener: (() => void) | null = null

	return {
		appDidMount() {
			const biForBrowserZoom = experiments['specs.thunderbolt.biForBrowserZoom']
			if (biForBrowserZoom) {
				cleanupBiListener = addBiForBrowserZoom(window, logger)
			}
		},
		appWillUnmount() {
			if (cleanupBiListener) {
				cleanupBiListener()
				cleanupBiListener = null
			}
		},
	}
}

export const AccessibilityBrowserZoomSite = withDependencies(
	[BrowserWindowSymbol, ExperimentsSymbol, LoggerSymbol] as const,
	accessibilityBrowserZoomSiteFactory
)
