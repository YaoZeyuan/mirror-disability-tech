import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { SsrCacheSiteSymbol } from './symbols'
import { SsrCacheSite } from './ssr-cache-site'
import { ssrCachePlatformEnvDataProvider } from './sdk/ssrCacheDataProvider'
import { ssrCacheWixCodeSdkHandlersProvider } from './sdk/ssrCacheSdkProvider'
import { PlatformEnvDataProviderSymbol, WixCodeSdkHandlersProviderSym } from '@wix/thunderbolt-symbols'

export { SsrCacheSdkFactory } from './sdk/ssrCacheSdkFactory'
export type { SsrCacheWixCodeSdkWixCodeApi } from './sdk/types'

export const site: ContainerModuleLoader = (bind) => {
	bind(SsrCacheSiteSymbol).to(SsrCacheSite)
	bind(PlatformEnvDataProviderSymbol).to(ssrCachePlatformEnvDataProvider)
	bind(WixCodeSdkHandlersProviderSym).to(ssrCacheWixCodeSdkHandlersProvider)
}

export { SsrCacheSiteSymbol }
export * from './symbols'
export * from './types'
export * as SsrCacheSdkTypes from './sdk/types'
export { namespace as ssrCacheNamespace } from './sdk/types'
