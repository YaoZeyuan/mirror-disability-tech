import { withDependencies, optional } from '@wix/thunderbolt-ioc'
import { SsrLoggerSymbol } from '@wix/thunderbolt-symbols'
import type { ISsrCacheSiteApi, SsrCacheSiteState } from './types'
import type { Logger } from '@wix/thunderbolt-types'

const MAX_CUSTOM_INVALIDATE_TAGS = 5

const initialState: SsrCacheSiteState = {
	customInvalidateTags: [],
}

export const SsrCacheSite = withDependencies([optional(SsrLoggerSymbol)], (ssrLogger: Logger): ISsrCacheSiteApi => {
	const tbLogger = ssrLogger

	const state: SsrCacheSiteState = {
		...initialState,
	}

	const api: ISsrCacheSiteApi = {
		getCustomInvalidateTags: () => state.customInvalidateTags,
		setCustomInvalidateTags: (customInvalidateTags) => {
			if (customInvalidateTags.length <= MAX_CUSTOM_INVALIDATE_TAGS) {
				state.customInvalidateTags = customInvalidateTags
			} else {
				tbLogger?.warn(`Cannot set custom invalidate tags - max number of tags is ${MAX_CUSTOM_INVALIDATE_TAGS}`)
			}
		},
	}

	return api
})
