import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { FeatureStateSymbol, MasterPageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { ILightboxUtils, LightboxFeatureState, LightboxesMasterPageConfig } from './types'
import { name } from './symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'

type LightboxUtilsFactory = (
	masterPageConfig: LightboxesMasterPageConfig,
	featureState: IFeatureState<LightboxFeatureState>
) => ILightboxUtils

const lightboxUtilsFactory: LightboxUtilsFactory = (masterPageConfig, featureState) => {
	return {
		isLightbox(pageId) {
			return masterPageConfig.popupPages[pageId]
		},
		getCurrentLightboxId() {
			return featureState.get()?.pendingLightboxId || featureState.get()?.currentLightboxId
		},
		getLightboxPages() {
			return masterPageConfig.popupPages
		},
		getLightboxRouteData() {
			return featureState.get()?.lightboxRouteData
		},
	}
}

export const LightboxUtils = withDependencies(
	[named(MasterPageFeatureConfigSymbol, name), named(FeatureStateSymbol, name)],
	lightboxUtilsFactory
)
