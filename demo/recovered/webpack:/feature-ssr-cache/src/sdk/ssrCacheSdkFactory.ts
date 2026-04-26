import type { SiteWixCodeSdkFactoryData, WixCodeApiFactoryArgs } from '@wix/thunderbolt-symbols'
import type {
	SsrCacheWixCodeSdkFactoryData,
	SsrCacheWixCodeSdkHandlers,
	SsrCacheWixCodeSdkWixCodeApi,
	SsrCacheVeloState,
	SsrCacheFactoryState,
	CacheTagsApp,
} from './types'
import { namespace } from './types'

const uuidRegex = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

function validateUuid(id: string, fieldName: string): void {
	if (!uuidRegex.test(id)) {
		throw new Error(`Invalid ${fieldName}: ${id}. Expected a valid UUID format.`)
	}
}

/**
 * SSR Cache SDK Factory
 */
export function SsrCacheSdkFactory({
	handlers,
	platformUtils: { sessionService, clientSpecMapApi },
	appDefinitionId: sdkInstanceAppDefinitionId,
}: WixCodeApiFactoryArgs<SiteWixCodeSdkFactoryData, SsrCacheWixCodeSdkFactoryData, SsrCacheWixCodeSdkHandlers>): Record<
	typeof namespace,
	SsrCacheWixCodeSdkWixCodeApi
> {
	const { setCustomInvalidateTags } = handlers.ssrCache

	// Initialize state
	const initialState: SsrCacheVeloState = {
		customInvalidateTags: [],
	}

	const state: SsrCacheFactoryState = {
		state: {
			ssrCache: { ...initialState },
		},
		setSSRCacheState(partialState: Partial<SsrCacheVeloState>) {
			Object.assign(state.state.ssrCache, partialState)
		},
	}

	const addSecurityPrefix = (tags: Array<string>, cacheTagsApp?: CacheTagsApp): Array<string> => {
		if (cacheTagsApp) {
			validateUuid(cacheTagsApp.appDefId, 'appDefId')
			validateUuid(cacheTagsApp.instanceId, 'instanceId')
		}

		const prefixAppDefId = cacheTagsApp?.appDefId || sdkInstanceAppDefinitionId

		// Only get appDefId/instanceId from appSpecData if cacheTagsApp is not provided
		let prefixInstanceId = cacheTagsApp?.instanceId
		if (!prefixInstanceId) {
			const appSpecData = clientSpecMapApi.getAppSpecData(sdkInstanceAppDefinitionId)
			if (!appSpecData || !appSpecData.instanceId) {
				throw new Error(
					`App spec data not found for app definition id: ${sdkInstanceAppDefinitionId} with instance id: ${appSpecData?.instanceId}`
				)
			}
			prefixInstanceId = appSpecData.instanceId
		}

		return tags.map((tag) => `${prefixAppDefId}_${prefixInstanceId}_${tag}`)
	}

	return {
		[namespace]: {
			get customInvalidateTags() {
				return state.state.ssrCache.customInvalidateTags
			},
			async setCustomInvalidateTags(customInvalidateTags: Array<string>, cacheTagsApp?: CacheTagsApp) {
				const secureCustomInvalidateTags = addSecurityPrefix(customInvalidateTags, cacheTagsApp)
				setCustomInvalidateTags(secureCustomInvalidateTags)
				state.setSSRCacheState({ customInvalidateTags: secureCustomInvalidateTags })
			},
		},
	}
}
