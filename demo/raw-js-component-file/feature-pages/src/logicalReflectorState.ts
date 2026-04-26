import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageReflectorStateApi } from '@wix/thunderbolt-symbols'
import { FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { name } from './symbols'
import type { PageState } from './types'

export const LogicalReflectorState = withDependencies(
	[named(FeatureStateSymbol, name)],
	(featureState: IFeatureState<PageState>): IPageReflectorStateApi => {
		return {
			isContainerExistsForContext: (contextId: string) => !!featureState.get()?.[contextId],
		}
	}
)
