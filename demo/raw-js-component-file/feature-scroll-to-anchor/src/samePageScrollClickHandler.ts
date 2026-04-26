import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageDidLoadHandler, ILinkClickHandler, IPageWillUnmountHandler } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol, pageIdSym } from '@wix/thunderbolt-symbols'
import type { ISamePageScroll, ScrollToAnchorPageConfig } from './types'
import { SamePageScrollSymbol, name } from './symbols'
import type { IUrlHistoryManager } from 'feature-router'
import { UrlHistoryManagerSymbol, removeQueryParams, replaceProtocol, removeUrlHash, getUrlHash } from 'feature-router'
import { TOP_ANCHOR } from './constants'
import type { IOnLinkClickHandler } from 'feature-click-handler-registrar'
import { OnLinkClickSymbol } from 'feature-click-handler-registrar'

export const samePageScrollClickHandlerFactory = (
	samePageScroll: ISamePageScroll,
	urlHistoryManager: IUrlHistoryManager,
	{ registerPageClickHandler, removePageClickHandler }: IOnLinkClickHandler,
	pageId: string,
	{ isBuilderComponentModel, anchorNameToCompIdMap, isResponsive }: ScrollToAnchorPageConfig
): ILinkClickHandler & IPageDidLoadHandler & IPageWillUnmountHandler => {
	if (isResponsive && pageId === 'masterPage') {
		const noop = () => {}
		return {
			handlerId: name,
			handleClick: () => false,
			pageDidLoad: noop,
			pageWillUnmount: noop,
		}
	}

	const handler: ILinkClickHandler = {
		handlerId: name,
		handleClick: (anchor) => {
			const anchorHref = anchor.getAttribute('href')
			if (!anchorHref) {
				return false
			}

			if (anchorHref === '#') {
				return samePageScroll.scrollToAnchor({ anchorDataId: TOP_ANCHOR })
			}

			const parsedUrl = urlHistoryManager.getParsedUrl()
			const href = replaceProtocol(anchorHref, parsedUrl.protocol)
			const cleanAnchorHref = removeUrlHash(removeQueryParams(href))
			const cleanCurrentUrl = urlHistoryManager.getFullUrlWithoutQueryParams()

			const isCurrentPageNavigation = cleanAnchorHref === cleanCurrentUrl
			const isLinkToNewTab = anchor.getAttribute('target') === '_blank'
			if (isLinkToNewTab || !isCurrentPageNavigation) {
				return false
			}

			let anchorCompId = anchor.getAttribute('data-anchor-comp-id') || getUrlHash(href) || ''
			// temp solution for builder. Will be removed once ids-to-class-names effort is complete. https://wix.atlassian.net/browse/TB-13017
			if (isBuilderComponentModel && anchorCompId) {
				anchorCompId = anchorNameToCompIdMap[anchorCompId] || anchorCompId
			}
			const anchorDataId = anchor.getAttribute('data-anchor') || ''
			const disableScrollToTop = parsedUrl.searchParams.get('disableScrollToTop') === 'true'
			if (!anchorCompId && !anchorDataId && isCurrentPageNavigation) {
				// reflect any query params changes in the url history on same page navigation
				urlHistoryManager.pushUrlState(new URL(href as string))

				// If scroll to top not disabled and if anchor href is, for current page need to scroll to top of the page
				return disableScrollToTop ? true : samePageScroll.scrollToAnchor({ anchorDataId: TOP_ANCHOR })
			}

			return samePageScroll.scrollToAnchor({ anchorDataId, anchorCompId })
		},
	}

	return {
		...handler,
		pageDidLoad: () => registerPageClickHandler(handler, pageId),
		pageWillUnmount: () => removePageClickHandler(handler, pageId),
	}
}

export const SamePageScrollClickHandler = withDependencies(
	[SamePageScrollSymbol, UrlHistoryManagerSymbol, OnLinkClickSymbol, pageIdSym, named(PageFeatureConfigSymbol, name)],
	samePageScrollClickHandlerFactory
)
