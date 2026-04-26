import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { CurrentRouteInfoSymbol, FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'
import type { ICurrentRouteInfo } from 'feature-router'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { ILightboxesPageNavigationHandler, LightboxFeatureState } from './types'

export const LightboxesPageNavigationHandler = withDependencies(
	[named(FeatureStateSymbol, 'lightbox'), NavigationManagerSymbol, CurrentRouteInfoSymbol],
	(
		featureState: IFeatureState<LightboxFeatureState>,
		navigationManager: INavigationManager,
		currentRouteInfo: ICurrentRouteInfo
	): ILightboxesPageNavigationHandler => {
		return {
			name: 'popupsPageNavigationHandler',
			appWillLoadPage: () => {
				if (navigationManager.isFirstNavigation() && !currentRouteInfo.isLandingOnProtectedPage()) {
					featureState.update((state) => ({
						...state,
						pendingLightboxPromise: navigationManager.waitForNavigationEnd(),
					}))
				}

				featureState.get()?.pageWillLoadHandler?.()
			},
		}
	}
)
