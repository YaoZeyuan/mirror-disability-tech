import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { LifeCycle } from '@wix/thunderbolt-symbols'
import { DomSelectorsSite } from './domSelectors'
import { ComponentIdsRegistryLoader } from './componentIdsRegistryLoader'
import { ComponentIdsRegistry } from './componentIdsRegistry'
import { DomSelectorsSymbol, ComponentIdsRegistrySymbol } from './symbols'

// Re-export pure helpers from thunderbolt-dom-utils for convenience
export {
	getByCompId,
	getClosestByCompId,
	closest,
	getElementCompId,
	querySelector,
	querySelectorAll,
	convertIdSelectorToClassSelector,
} from '@wix/thunderbolt-dom-utils'

export type { DomSelectorOptions } from '@wix/thunderbolt-dom-utils'

export { DomSelectorsSymbol, ComponentIdsRegistrySymbol } from './symbols'
export type { IDomSelectors, DomSelectorsPageConfig, IComponentIdsRegistry } from './types'

// Site-level: bind the registry and DomSelectors
export const site: ContainerModuleLoader = (bind) => {
	bind(ComponentIdsRegistrySymbol).to(ComponentIdsRegistry)
	bind(DomSelectorsSymbol).to(DomSelectorsSite)
}

// Page-level: populate the registry with component IDs from page config
export const page: ContainerModuleLoader = (bind) => {
	bind(LifeCycle.PageWillMountHandler).to(ComponentIdsRegistryLoader)
}

// Editor binding is in src/ds/index.ts to avoid pulling DS dependencies into viewer bundle
