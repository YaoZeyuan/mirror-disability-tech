import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { ILightbox, LightboxSiteConfig } from './index'
import { LightboxSymbol, name } from './index'
import type { ILinkClickHandler, Experiments } from '@wix/thunderbolt-symbols'
import { SiteFeatureConfigSymbol, ExperimentsSymbol } from '@wix/thunderbolt-symbols'
import type { IUrlHistoryManager } from 'feature-router'
import {
	UrlHistoryManagerSymbol,
	removeQueryParams,
	removeProtocol,
	getUrlQueryParam,
	getUrlHash,
} from 'feature-router'

const TOP_AND_BOTTOM_ANCHORS = ['SCROLL_TO_TOP', 'SCROLL_TO_BOTTOM']

const getPopupId = (anchorOrButtonElement: HTMLElement, isBuilderComponentModel: boolean) => {
	if (isBuilderComponentModel) {
		const href = anchorOrButtonElement.getAttribute('href')
		return getUrlQueryParam(href || '', 'popup')
	}
	return anchorOrButtonElement.getAttribute('data-popupid')
}

const getAnchorDataId = (anchorOrButtonElement: HTMLElement, isBuilderComponentModel: boolean) => {
	if (isBuilderComponentModel) {
		const href = anchorOrButtonElement.getAttribute('href')
		return getUrlHash(href || '')
	}
	return anchorOrButtonElement.getAttribute('data-anchor') || ''
}

const getIsTopBottomAnchor = (anchorOrButtonElement: HTMLElement, isBuilderComponentModel: boolean) => {
	const anchorDataId = getAnchorDataId(anchorOrButtonElement, isBuilderComponentModel)
	return TOP_AND_BOTTOM_ANCHORS.includes(anchorDataId)
}

const lightboxLinkFactory = (
	lightboxApi: ILightbox,
	urlHistoryManager: IUrlHistoryManager,
	experiments: Experiments,
	{ isBuilderComponentModel }: LightboxSiteConfig
): ILinkClickHandler => ({
	handlerId: name,
	handleClick: (anchorOrButtonElement) => {
		const popupId = getPopupId(anchorOrButtonElement, isBuilderComponentModel)
		if (popupId) {
			lightboxApi.open(popupId)
			return true
		}
		const fullUrlWithoutQueryParams = urlHistoryManager.getFullUrlWithoutQueryParams()
		const isLightboxOpen = !!lightboxApi.getCurrentLightboxId()
		const href = anchorOrButtonElement.getAttribute('href')
		const hrefWithoutQueryParams = href && removeQueryParams(href)
		const fullUrlNoProtocol = removeProtocol(fullUrlWithoutQueryParams)
		const hrefNoProtocol = removeProtocol(hrefWithoutQueryParams || '')

		const isLinkToCurrentPage = fullUrlNoProtocol === hrefNoProtocol

		const isTopBottomAnchor = getIsTopBottomAnchor(anchorOrButtonElement, isBuilderComponentModel)
		const isLinkToNewTab = anchorOrButtonElement.getAttribute('target') === '_blank'

		if (isLightboxOpen && (isLinkToCurrentPage || isTopBottomAnchor) && !isLinkToNewTab) {
			lightboxApi.close()
		}

		return false
	},
})

export const LightboxLink = withDependencies(
	[LightboxSymbol, UrlHistoryManagerSymbol, ExperimentsSymbol, named(SiteFeatureConfigSymbol, name)],
	lightboxLinkFactory
)
