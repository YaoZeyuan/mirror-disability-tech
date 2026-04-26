import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { RouterFetchSymbol } from './symbols'
import { RouterFetch } from './routerFetch'

export const site: ContainerModuleLoader = (bind) => {
	bind(RouterFetchSymbol).to(RouterFetch)
}

export const editor = site

export { RouterFetchSymbol } from './symbols'
export { RouterFetchRequestTypes } from './types'
export type { RouterFetchAPI } from './types'
