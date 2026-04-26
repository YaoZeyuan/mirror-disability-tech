import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import { name } from './symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { IPermissionsHandlerProvider, PermissionsHandlerState } from './types'
import { errorPagesIds } from './utils'

const permissionsHandlerProviderFactory = (
	featureState: IFeatureState<PermissionsHandlerState>
): IPermissionsHandlerProvider => {
	return {
		getHandler: () => {
			return {
				handle: async (routeInfoFromResponsePromise, routeInfo) => {
					const routeInfoFromResponse = await routeInfoFromResponsePromise
					const { handlePermissions, isMemberLoggedIn, isSiteMembersInstalled } = featureState.get()
					const isUserLoggedIn = await isMemberLoggedIn()
					if (isSiteMembersInstalled && routeInfoFromResponse?.pageId === errorPagesIds.FORBIDDEN && !isUserLoggedIn) {
						handlePermissions(routeInfoFromResponse, routeInfo).catch((error) => {
							console.error('Error handling permissions', error)
						})
						return null
					}

					return routeInfoFromResponse
				},
			}
		},
	}
}

export const PermissionsHandlerProvider = withDependencies(
	[named(FeatureStateSymbol, name)],
	permissionsHandlerProviderFactory
)
