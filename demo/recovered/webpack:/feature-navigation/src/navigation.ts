import { named, withDependencies, optional } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, Experiments } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, ExperimentsSymbol, FeatureExportsSymbol } from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import type { INavigation } from './types'
import type { IRouter, IUrlHistoryManager, IShouldNavigateHandler } from 'feature-router'
import {
	Router as RouterSymbol,
	UrlHistoryManagerSymbol,
	keepInternalQueryParamsOnly,
	ShouldNavigateHandlerSymbol,
} from 'feature-router'
import type { ILightbox } from 'feature-lightbox'
import { LightboxSymbol } from 'feature-lightbox'
import type { IMpaNavigation } from 'feature-mpa-navigation'
import { MpaNavigationSymbol, isSameUrlExceptQuery } from 'feature-mpa-navigation'
import type { ISamePageScroll } from 'feature-scroll-to-anchor'
import { SamePageScrollSymbol } from 'feature-scroll-to-anchor'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import { name } from './symbols'

const externalLinkTypeMap: Record<any, boolean> = {
	DocumentLink: true,
	PhoneLink: true,
	EmailLink: true,
	ExternalLink: true,
}

const navigationFactory = (
	window: BrowserWindow,
	router: IRouter,
	urlManager: IUrlHistoryManager,
	samePageScroll: ISamePageScroll,
	{ shouldNavigate }: IShouldNavigateHandler,
	navigationExports: IFeatureExportsStore<typeof name>,
	experiments: Experiments,
	domSelectors: IDomSelectors,
	lightboxApi?: ILightbox,
	mpaNavigation?: IMpaNavigation
): INavigation => {
	const navigateTo: INavigation['navigateTo'] = async (linkProps, navigationParams) => {
		if (!shouldNavigate(linkProps)) {
			return false
		}
		const { href, target, linkPopupId, anchorCompId, type } = linkProps

		const anchorDataId = ((linkProps.anchorDataId as { id: string })?.id || linkProps.anchorDataId) as string

		// PopupPageLink
		if (linkPopupId) {
			await lightboxApi!.open(linkPopupId)
			return true
		}

		// External links
		if (window && type && externalLinkTypeMap[type]) {
			window.open(href, target)
			return true
		}

		// MPA navigation for eligible links
		if (
			window &&
			href &&
			mpaNavigation &&
			(!window || !isSameUrlExceptQuery(window.location.href, href)) &&
			mpaNavigation.isEligible({ anchorCompId, anchorDataId, skipHistory: navigationParams?.skipHistory })
		) {
			return mpaNavigation.navigate(href)
		}

		// PageLink, DynamicPageLink, different page AnchorLink
		if (!router.isInternalValidRoute(href!)) {
			return false
		}
		const currentFullUrl = urlManager.getFullUrlWithoutQueryParams()
		const didNavigateToDifferentPage =
			currentFullUrl !== href && (await router.navigate(href!, { anchorDataId, ...navigationParams }))

		if (didNavigateToDifferentPage) {
			return true
		}

		/* THIS METHOD SHOULD RETURN FALSE FROM NOW ON */

		// Same page AnchorLink
		if (anchorCompId || anchorDataId) {
			if (anchorCompId && !domSelectors.getByCompId(anchorCompId, window!.document)) {
				// anchor not on page
				return false
			}
			samePageScroll.scrollToAnchor({ anchorCompId, anchorDataId })
			return false
		}

		if (href) {
			const url = urlManager.getParsedUrl()
			// Clear all search params besides the internal query params, to make it possible to clear query params.
			url.search = keepInternalQueryParamsOnly(url.searchParams)
			// We're passing url.origin as base to allow parsing relative hrefs.
			const { searchParams: nextUrlSearchParams } = new URL(href, url.origin)

			nextUrlSearchParams.forEach((val, key) => url?.searchParams.set(key, val))

			urlManager.pushUrlState(url)

			// if same page navigation and popup is open we should close it
			if (lightboxApi?.getCurrentLightboxId()) {
				await lightboxApi?.close()
				return false
			}

			// Same page navigation triggered by state change doesn't scroll to top
			if (navigationParams?.disableScrollToTop) {
				return false
			}

			// Same page navigation with no anchors should scroll to top
			samePageScroll.scrollToAnchor({ anchorDataId: 'SCROLL_TO_TOP' })
			return false
		}
		return false
	}
	navigationExports.export({ navigateTo })

	return {
		navigateTo,
	}
}

export const Navigation = withDependencies(
	[
		BrowserWindowSymbol,
		RouterSymbol,
		UrlHistoryManagerSymbol,
		SamePageScrollSymbol,
		ShouldNavigateHandlerSymbol,
		named(FeatureExportsSymbol, name),
		ExperimentsSymbol,
		DomSelectorsSymbol,
		optional(LightboxSymbol),
		optional(MpaNavigationSymbol),
	],
	navigationFactory
)
