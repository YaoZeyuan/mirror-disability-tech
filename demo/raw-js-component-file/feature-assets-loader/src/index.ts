import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { PageResourceFetcher } from './PageResourceFetcher'
import { PageStyleLoaderSymbol } from './symbols'
import { PageAssetsLoaderImpl } from './PageAssetsLoader'
import type { ILoadPageStyle } from './PageStyleLoader'
import { ClientPageStyleLoader, ServerPageStyleLoader, PageMainCssFetcher } from './PageStyleLoader'

export { aAssetsLoaderSiteConfig } from './testkit/aAssetsLoaderSiteConfig'

import type { IPageAssetsLoader, ICssFetcher, IPageResourceFetcher } from '@wix/thunderbolt-symbols'
import { PageAssetsLoaderSymbol, CssFetcherSymbol, PageResourceFetcherSymbol } from '@wix/thunderbolt-symbols'

export const site: ContainerModuleLoader = (bind) => {
	bind<IPageResourceFetcher>(PageResourceFetcherSymbol).to(PageResourceFetcher)
	bind<IPageAssetsLoader>(PageAssetsLoaderSymbol).to(PageAssetsLoaderImpl)
	bind<ICssFetcher>(CssFetcherSymbol).to(PageMainCssFetcher)
	if (process.env.browser) {
		bind<ILoadPageStyle>(PageStyleLoaderSymbol).to(ClientPageStyleLoader)
	} else {
		bind<ILoadPageStyle>(PageStyleLoaderSymbol).to(ServerPageStyleLoader)
	}
}
