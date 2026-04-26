import { withDependencies } from '@wix/thunderbolt-ioc'
import { ExperimentsSymbol, LoggerSymbol } from '@wix/thunderbolt-symbols'
import type { Experiments, ILogger } from '@wix/thunderbolt-symbols'
import {
	getByCompId as pureGetByCompId,
	getClosestByCompId as pureGetClosestByCompId,
	closest as pureClosest,
	querySelector as pureQuerySelector,
	querySelectorAll as pureQuerySelectorAll,
	getElementCompId as pureGetElementCompId,
} from '@wix/thunderbolt-dom-utils'
import type { IDomSelectors, IComponentIdsRegistry } from './types'
import { ComponentIdsRegistrySymbol } from './symbols'

const createDomSelectorsImpl = (
	experiments: Experiments,
	logger: ILogger,
	getComponentIds: () => Set<string> | undefined
): IDomSelectors => {
	// Detect if running in editor mode (thunderbolt-ds)
	const isEditor = process.env.PACKAGE_NAME === 'thunderbolt-ds'

	return {
		getByCompId: (compId: string, doc?: Document) => {
			return pureGetByCompId(compId, {
				experiments,
				logger,
				document: doc,
			}) as HTMLElement | null
		},

		getClosestByCompId: (element: Element, compId: string) => {
			return pureGetClosestByCompId(element, compId, {
				experiments,
				logger,
			})
		},

		closest: (element: Element, selector: string) => {
			return pureClosest(element, selector, {
				experiments,
				logger,
			})
		},

		querySelector: (selector: string, doc?: Document, element?: Element) => {
			return pureQuerySelector(selector, {
				experiments,
				logger,
				document: doc,
				element,
			})
		},

		querySelectorAll: (selector: string, doc?: Document, element?: Element) => {
			return pureQuerySelectorAll(selector, {
				experiments,
				logger,
				document: doc,
				element,
			})
		},

		getElementCompId: (element: Element) => {
			// Get component IDs dynamically - allows for reactive updates
			return pureGetElementCompId(element, {
				componentIds: getComponentIds(),
				experiments,
				isEditor,
			})
		},
	}
}

/**
 * Site-level binding - reads from ComponentIdsRegistry
 * The registry is populated by:
 * - Viewer: PageWillMountHandler (from pageConfig.allComponentIds)
 * - Editor: Carmi side effects (onComponentsChange)
 */
export const DomSelectorsSite = withDependencies<IDomSelectors>(
	[ExperimentsSymbol, LoggerSymbol, ComponentIdsRegistrySymbol] as const,
	(experiments, logger, registry: IComponentIdsRegistry) =>
		createDomSelectorsImpl(experiments, logger, () => registry.getAll())
)
