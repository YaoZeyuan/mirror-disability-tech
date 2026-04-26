import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IRoutingMiddleware } from 'feature-router'
import { name } from './symbols'
import type { SiteMembersState } from './types'
import { FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'

const renderingBlockingDialogsMiddleware = (featureState: IFeatureState<SiteMembersState>): IRoutingMiddleware => ({
	handle: async (routeInfo) => {
		const { shouldShowRenderingBlockingDialogs, showRenderingBlockingDialogs } = featureState.get()
		if (shouldShowRenderingBlockingDialogs(routeInfo)) {
			showRenderingBlockingDialogs()
			return null
		}

		return routeInfo
	},
})

export const RenderingBlockingDialogsMiddleware = withDependencies(
	[named(FeatureStateSymbol, name)],
	renderingBlockingDialogsMiddleware
)
