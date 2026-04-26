import { withDependencies, named, optional } from '@wix/thunderbolt-ioc'
import type { IPageDidLoadHandler } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol, CurrentRouteInfoSymbol } from '@wix/thunderbolt-symbols'
import type { ScrollToAnchorPageConfig } from './types'
import { name } from './symbols'
import type { IWindowScrollAPI } from 'feature-window-scroll'
import { WindowScrollApiSymbol } from 'feature-window-scroll'
import type { ICurrentRouteInfo } from 'feature-router'
import { TOP_AND_BOTTOM_ANCHORS, TOP_ANCHOR } from './constants'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'
import type { IPostNavigationFocus } from './postNavigationFocus'
import { PostNavigationFocusSymbol } from './postNavigationFocus'

const postNavigationScrollFactory = (
	{
		nicknameToCompIdMap,
		anchorDataIdToCompIdMap,
		anchorNameToCompIdMap,
		isBuilderComponentModel,
	}: ScrollToAnchorPageConfig,
	routeInfo: ICurrentRouteInfo,
	windowScrollApi: IWindowScrollAPI,
	popupUtils?: ILightboxUtils,
	postNavigationFocus?: IPostNavigationFocus
): IPageDidLoadHandler => {
	return {
		pageDidLoad: ({ pageId }) => {
			const currentRouteInfo = routeInfo.getCurrentRouteInfo()
			if (popupUtils?.isLightbox(pageId) || !currentRouteInfo) {
				return
			}

			const { anchorDataId, parsedUrl } = currentRouteInfo
			if (anchorDataId) {
				// Normally the browser scrolls by itself to anchors when it
				// sees hash in the URL. in our single page application
				// the url changes to contain the hash before the anchor with
				// that id is rendered, so we need to perform the scroll ourselves
				const isHashAnchor = parsedUrl.hash.endsWith(anchorDataId)
				const isTopBottomAnchor = TOP_AND_BOTTOM_ANCHORS.includes(anchorDataId)
				let compId
				if (isTopBottomAnchor) {
					compId = anchorDataId
				} else if (isHashAnchor) {
					const anchorCompId = isBuilderComponentModel && anchorNameToCompIdMap[parsedUrl.hash.slice(1)]
					compId = anchorCompId || anchorDataId
				} else {
					compId = anchorDataIdToCompIdMap[anchorDataId] || nicknameToCompIdMap[anchorDataId]
				}
				if (!compId) {
					compId = anchorDataId
				}
				const skipScrollAnimation = anchorDataId === TOP_ANCHOR

				compId && windowScrollApi.scrollToComponent(compId, { callbacks: undefined, skipScrollAnimation })
			} else {
				postNavigationFocus?.focus()
			}
		},
	}
}

export const PostNavigationScroll = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		CurrentRouteInfoSymbol,
		WindowScrollApiSymbol,
		optional(LightboxUtilsSymbol),
		optional(PostNavigationFocusSymbol),
	],
	postNavigationScrollFactory
)
