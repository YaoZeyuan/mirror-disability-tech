import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { SiteScrollBlockerSymbol, name } from './symbols'
import { SiteScrollBlocker } from './siteScrollBlocker'

export const site: ContainerModuleLoader = (bind) => {
	bind(SiteScrollBlockerSymbol).to(SiteScrollBlocker)
}

export const editor: ContainerModuleLoader = site

export type { ISiteScrollBlocker, IScrollBlockedListener } from '@wix/viewer-service-site-scroll-blocker/types'
export { name, SiteScrollBlockerSymbol }
