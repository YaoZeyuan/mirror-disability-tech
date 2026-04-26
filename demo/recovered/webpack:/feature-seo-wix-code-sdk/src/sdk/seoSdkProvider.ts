import type { SeoWixCodeSdkHandlers } from '../types'
import type { ISeoSiteApi } from 'feature-seo'
import { SeoSiteSymbol } from 'feature-seo'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { SdkHandlersProvider } from '@wix/thunderbolt-symbols'

export const seoWixCodeSdkHandlersProvider = withDependencies(
	[SeoSiteSymbol],
	(seoApi: ISeoSiteApi): SdkHandlersProvider<SeoWixCodeSdkHandlers> => ({
		getSdkHandlers: () => ({
			seo: {
				async setTitle(title) {
					await seoApi.setVeloTitle(title)
				},
				async setLinks(links) {
					await seoApi.setVeloLinks(links)
				},
				async setMetaTags(metaTags) {
					await seoApi.setVeloMetaTags(metaTags)
				},
				async setStructuredData(structuredData) {
					await seoApi.setVeloStructuredData(structuredData)
				},
				// Deprecated. Use setStatusCode instead. TODO: remove
				async setSeoStatusCode(seoStatusCode) {
					await seoApi.setStatusCode(seoStatusCode)
				},
				setStatusCode(seoStatusCode) {
					seoApi.setStatusCode(seoStatusCode)
				},
				async renderSEOTags(payload) {
					await seoApi.setVeloSeoTags(payload)
				},
				async resetSEOTags() {
					await seoApi.resetVeloSeoTags()
				},
				async onTPAOverrideChanged(cb) {
					return seoApi.onTPAOverridesChanged(cb)
				},
			},
		}),
	})
)
