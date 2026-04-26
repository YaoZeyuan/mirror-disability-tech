import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ISsrCacheSiteApi } from '../types'
import { SsrCacheSiteSymbol } from '../symbols'
import type { PlatformEnvDataProvider } from '@wix/thunderbolt-symbols'

export const ssrCachePlatformEnvDataProvider = withDependencies(
	[SsrCacheSiteSymbol],
	(ssrCacheApi: ISsrCacheSiteApi): PlatformEnvDataProvider => {
		return {
			platformEnvData() {
				return {
					ssrCache: {
						customInvalidateTags: ssrCacheApi.getCustomInvalidateTags(),
					},
				} as any
			},
		}
	}
)
