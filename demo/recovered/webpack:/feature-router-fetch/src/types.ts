import type { RouterFetchData, ViewerModel } from '@wix/thunderbolt-symbols'
import type { FetchParams } from 'feature-router'

export type RouterFetchSiteConfig = { externalBaseUrl: string; viewMode: ViewerModel['viewMode'] }

export enum RouterFetchRequestTypes {
	PAGES = 'pages',
	SITEMAP = 'sitemap',
	Lightboxes = 'lightboxes',
}

type LightboxesFetchAdditionalData = { lightboxId: string; dynamicPageIdOverride?: string }
type DynamicPagesFetchAdditionalData = { routerSuffix: string; queryParams: string; dynamicPageIdOverride?: string }
export type RouterFetchAdditionalData = LightboxesFetchAdditionalData | DynamicPagesFetchAdditionalData

export type RouterFetchAPI = {
	getFetchParams: (
		requestType: RouterFetchRequestTypes,
		routerFetchData: RouterFetchData,
		additionalData: RouterFetchAdditionalData
	) => FetchParams
	tryToGetCachableFetchParams: (
		requestType: RouterFetchRequestTypes,
		routerFetchData: RouterFetchData,
		additionalData: RouterFetchAdditionalData
	) => Promise<FetchParams>
}
