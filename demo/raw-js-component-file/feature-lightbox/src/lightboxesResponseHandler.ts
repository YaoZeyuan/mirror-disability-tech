import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { ILightboxesResponseHandler, LightboxFeatureState } from './types'
import { FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { name } from './symbols'

export const LightboxesResponseHandler = withDependencies(
	[named(FeatureStateSymbol, name)],
	(featureState: IFeatureState<LightboxFeatureState>): ILightboxesResponseHandler => {
		return {
			async handleResponse(routerResponse) {
				return routerResponse
					.then(async (response: Response) => {
						if (!response.ok) {
							throw response
						}

						const { result } = await response.json()
						const { page: pageId, data: pageData, head: pageHeadData, publicData } = result

						const lightboxRouteData = {
							publicData,
							pageHeadData,
							pageData,
						}
						featureState.update((state) => ({
							...state,
							lightboxRouteData,
						}))

						return {
							pageId: pageId || null,
						}
					})
					.catch(() => {
						return {
							pageId: null,
						}
					})
			},
		}
	}
)
