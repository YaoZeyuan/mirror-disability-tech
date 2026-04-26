import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { HeadContentProviderSymbol, LifeCycle } from '@wix/thunderbolt-symbols'
import { DomStoreHeadContentProvider } from './ssr/domStoreHeadContentProvider'
import { DomStorePageWillMount } from './public/domStorePageWillMount'
import { SvgDomStoreLoader } from './domStore/svgDomStoreLoader'
import { SvgFetcher } from './domStore/svgFetcher'
import { DomStoreSymbol, SvgDomStoreLoaderSymbol, SvgFetcherSymbol } from './symbols'
import { ClientDomStore } from './public/clientDomStore'
import { ServerDomStore } from './ssr/serverDomStore'

export const site: ContainerModuleLoader = (bind) => {
	if (!process.env.browser) {
		bind(HeadContentProviderSymbol).to(DomStoreHeadContentProvider)
	}
}

export const page: ContainerModuleLoader = (bind) => {
	if (process.env.browser) {
		bind(DomStoreSymbol).to(ClientDomStore)
	} else {
		bind(DomStoreSymbol).to(ServerDomStore)
	}
	bind(SvgFetcherSymbol).to(SvgFetcher)
	bind(LifeCycle.PageWillMountHandler).to(DomStorePageWillMount)
	bind(SvgDomStoreLoaderSymbol).to(SvgDomStoreLoader)
}
