import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { PageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { IPageWillMountHandler } from '@wix/thunderbolt-symbols'
import { name, ComponentIdsRegistrySymbol } from './symbols'
import type { DomSelectorsPageConfig, IComponentIdsRegistry } from './types'

export const ComponentIdsRegistryLoader = withDependencies(
	[named(PageFeatureConfigSymbol, name), ComponentIdsRegistrySymbol] as const,
	(pageConfig: DomSelectorsPageConfig, registry: IComponentIdsRegistry): IPageWillMountHandler => {
		return {
			name: 'componentIdsRegistryLoader',
			pageWillMount: async () => {
				// Populate the site-level registry with component IDs from this page
				if (pageConfig.allComponentIds) {
					pageConfig.allComponentIds.forEach((id) => registry.add(id))
				}
			},
		}
	}
)
