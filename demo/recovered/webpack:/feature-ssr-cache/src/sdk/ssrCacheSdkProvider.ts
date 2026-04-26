import type { SsrCacheWixCodeSdkHandlers } from './types'
import type { ISsrCacheSiteApi } from '../types'
import { SsrCacheSiteSymbol } from '../symbols'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { SdkHandlersProvider } from '@wix/thunderbolt-symbols'

export const ssrCacheWixCodeSdkHandlersProvider = withDependencies(
	[SsrCacheSiteSymbol],
	(ssrCacheApi: ISsrCacheSiteApi): SdkHandlersProvider<SsrCacheWixCodeSdkHandlers> => ({
		getSdkHandlers: () => ({
			ssrCache: {
				async setCustomInvalidateTags(customInvalidateTags) {
					ssrCacheApi.setCustomInvalidateTags(customInvalidateTags)
				},
			},
		}),
	})
)
