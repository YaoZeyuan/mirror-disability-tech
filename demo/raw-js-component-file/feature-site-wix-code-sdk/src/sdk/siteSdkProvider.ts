import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	SdkHandlersProvider,
	BrowserWindow,
	IPageAssetsLoader,
	IPageResourceFetcher,
} from '@wix/thunderbolt-symbols'
import {
	DynamicPagesSymbol,
	BrowserWindowSymbol,
	PageAssetsLoaderSymbol,
	PageResourceFetcherSymbol,
} from '@wix/thunderbolt-symbols'

import type { DynamicPagesAPI } from 'feature-router'
import type { SiteWixCodeSdkHandlers } from '../types'
import type { ISpeculationRules } from 'feature-speculation-rules'
import { SpeculationRulesSymbol } from 'feature-speculation-rules'
import type { IMpaNavigation } from 'feature-mpa-navigation'
import { MpaNavigationSymbol } from 'feature-mpa-navigation'

export const siteSdkProvider = withDependencies(
	[
		optional(DynamicPagesSymbol),
		PageAssetsLoaderSymbol,
		BrowserWindowSymbol,
		optional(PageResourceFetcherSymbol),
		optional(MpaNavigationSymbol),
		optional(SpeculationRulesSymbol),
	],
	(
		dynamicPagesAPI: DynamicPagesAPI,
		pageAssetsLoader: IPageAssetsLoader,
		browserWindow: BrowserWindow,
		pageResourceFetcher?: IPageResourceFetcher,
		mpaNavigation?: IMpaNavigation,
		speculationRules?: ISpeculationRules
	): SdkHandlersProvider<SiteWixCodeSdkHandlers> => ({
		getSdkHandlers: () => ({
			getSitemapFetchParams: (routePrefix) => {
				if (!dynamicPagesAPI) {
					return null
				}

				return dynamicPagesAPI.getSitemapFetchParams(routePrefix)
			},
			prefetchPagesResources: (pageIds: Array<string>, lightboxIds: Array<string>, pageUrls: Array<string>) => {
				const isMpaEligible = mpaNavigation?.isEligible()

				if (isMpaEligible && pageUrls.length > 0) {
					speculationRules?.prefetchPages(pageUrls)
				}

				if (pageResourceFetcher) {
					const pageIdsToPrefetch = isMpaEligible ? lightboxIds : [...pageIds, ...lightboxIds]

					pageIdsToPrefetch
						.filter((pageId) => pageResourceFetcher.getPageJsonFileName(pageId))
						.forEach((pageId) => pageAssetsLoader.load(pageId, {}))
				}
			},
			getMasterPageStyle: async () => {
				const themStyles = browserWindow?.document.querySelector('#css_masterPage')?.innerHTML || ''
				let cssVarsMapping = ''
				const inlineStyle = browserWindow?.document.querySelector(
					'style[data-url*="wix-thunderbolt/dist/main.renderer"]'
				)?.innerHTML
				if (inlineStyle) {
					cssVarsMapping = inlineStyle
				} else {
					// in case inlineHandler was disabled for some reason
					const linkStyle = (
						browserWindow?.document.querySelector('link[href*="wix-thunderbolt/dist/main.renderer"]') as HTMLLinkElement
					)?.href
					if (linkStyle) {
						cssVarsMapping = `@import url('${linkStyle}');`
					}
				}
				return `
				${cssVarsMapping}
				${themStyles}
				`
			},
		}),
	})
)
