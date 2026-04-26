import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageDidMountHandler, IPageDidUnmountHandler } from '@wix/thunderbolt-symbols'
import { NavigationManagerSymbol } from '@wix/thunderbolt-symbols'
import type { INavigationManager } from './types'

export const NavigationPageDidMountHandler = withDependencies(
	[NavigationManagerSymbol],
	(navigationManager: INavigationManager): IPageDidMountHandler & IPageDidUnmountHandler => {
		return {
			pageDidMount: () => {
				if (navigationManager.isFirstNavigation()) {
					navigationManager.endNavigation()
				}
			},
			pageDidUnmount: () => {
				if (!navigationManager.isFirstNavigation()) {
					navigationManager.endNavigation()
				}
			},
		}
	}
)
