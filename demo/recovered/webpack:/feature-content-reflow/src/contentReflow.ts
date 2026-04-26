import { withDependencies } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, IPageDidMountHandler } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, pageIdSym } from '@wix/thunderbolt-symbols'
import { ContentReflowZoomDetectionSymbol } from './symbols'
import type { IContentReflowZoomDetection } from './types'
import { getSafariMajorVersion, isSafari, isSSR } from '@wix/thunderbolt-commons'

const contentReflowFactory = (
	contentReflowZoomDetection: IContentReflowZoomDetection,
	browserWindow: NonNullable<BrowserWindow>,
	pageId: string
): IPageDidMountHandler => {
	return {
		pageDidMount() {
			// older versions of safari does not support use of addEventListener to media queries
			if (
				!isSSR(browserWindow) &&
				(!isSafari(browserWindow) || getSafariMajorVersion(browserWindow) >= 14) &&
				pageId !== 'masterPage'
			) {
				contentReflowZoomDetection.activate()
			}
		},
	}
}

export const ContentReflow = withDependencies(
	[ContentReflowZoomDetectionSymbol, BrowserWindowSymbol, pageIdSym],
	contentReflowFactory
)
