import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type { IAppWillMountHandler } from '@wix/thunderbolt-symbols'
import { CurrentRouteInfoSymbol, FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import { name } from './symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { HandlePermissions, PermissionsHandlerState } from './types'
import type { ICurrentRouteInfo, IRouter } from 'feature-router'
import { Router } from 'feature-router'
import type { ISiteMembersApi } from 'feature-site-members'
import { AUTH_RESULT_REASON, SiteMembersApiSymbol } from 'feature-site-members'

export const PermissionsHandler = withDependencies(
	[named(FeatureStateSymbol, name), Router, CurrentRouteInfoSymbol, optional(SiteMembersApiSymbol)],
	(
		featureState: IFeatureState<PermissionsHandlerState>,
		router: IRouter,
		currentRouteInfo: ICurrentRouteInfo,
		siteMembersApi?: ISiteMembersApi
	): IAppWillMountHandler => {
		const doLogin = async (): Promise<{ success: boolean; reason: string }> => {
			try {
				await siteMembersApi!.promptLogin()
				return { success: true, reason: '' }
			} catch (error) {
				return { success: false, reason: error }
			}
		}

		const handlePermissions: HandlePermissions = async (routeInfoFromResponse, intentRouteInfo) => {
			const { success, reason } = await doLogin()
			if (reason === AUTH_RESULT_REASON.CANCELED && currentRouteInfo.isLandingOnProtectedPage()) {
				return router.navigate('./')
			}

			if (success) {
				return router.navigate(intentRouteInfo.parsedUrl!.href)
			}

			return false
		}

		featureState.update(() => ({
			handlePermissions,
			isMemberLoggedIn: async () => !!(await siteMembersApi?.getMemberDetails()),
			isSiteMembersInstalled: !!siteMembersApi,
		}))

		return {
			appWillMount: async () => {},
		}
	}
)
