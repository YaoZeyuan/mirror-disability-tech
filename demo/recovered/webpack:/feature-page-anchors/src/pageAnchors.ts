import { withDependencies, named, optional } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IDomSelectors,
	IPropsStore,
	IPageDidMountHandler,
	IPageWillUnmountHandler,
	Experiments,
	IPageServicesRegistrar,
} from '@wix/thunderbolt-symbols'
import {
	PageFeatureConfigSymbol,
	MasterPageFeatureConfigSymbol,
	BrowserWindowSymbol,
	DomSelectorsSymbol,
	Props,
	pageIdSym,
	ExperimentsSymbol,
	PageServicesManagerSymbol,
} from '@wix/thunderbolt-symbols'
import type { PageAnchorsPageConfig, PageAnchorsMasterPageConfig, PageAnchorsData } from './types'
import { name } from './symbols'
import { createAnchorObserver } from './pageAnchorsUtils'
import { AnchorsDefinition } from '@wix/viewer-service-anchors/definition'

/**
 * This is your feature.
 * You can get your configuration written in site-assets and viewer-model injected into your feature
 */
const pageAnchorsFactory = (
	pageFeatureConfig: PageAnchorsPageConfig,
	masterPageConfig: PageAnchorsMasterPageConfig,
	window: BrowserWindow,
	propsStore: IPropsStore,
	pageId: string,
	experiments: Experiments,
	domSelectors: IDomSelectors,
	servicesManagerGetter?: IPageServicesRegistrar
): IPageDidMountHandler & IPageWillUnmountHandler => {
	const servicesManager = servicesManagerGetter?.get()
	const isServicesInfra = experiments['specs.thunderbolt.servicesInfra'] || pageFeatureConfig.isBuilderComponentModel
	const isServiceOpen = servicesManager && isServicesInfra && servicesManager.hasService(AnchorsDefinition)

	const pageAnchorsObservers = pageFeatureConfig.pageAnchorsObservers.concat(masterPageConfig.pageAnchorsObservers)
	const activeAnchorObservers = pageFeatureConfig.activeAnchorObservers.concat(masterPageConfig.activeAnchorObservers)
	const anchors = [...new Set([...pageFeatureConfig.anchors, ...masterPageConfig.anchors]).values()]
	const headerCompId = pageFeatureConfig.headerComponentId
	const anchorsData: PageAnchorsData = {
		pageAnchorsObservers,
		activeAnchorObservers,
		anchors,
		pageId,
		headerCompId,
		siteOffset: masterPageConfig.siteOffset,
		reCheckAnchors: false,
	}
	const observeAnchors =
		pageId !== 'masterPage'
			? createAnchorObserver(anchorsData, window, propsStore, domSelectors)
			: () => () => undefined

	let observersCleanup: () => void | undefined

	return {
		pageDidMount(): void {
			if (pageAnchorsObservers.length || activeAnchorObservers.length) {
				if (pageId === 'masterPage') {
					observersCleanup = () => undefined
				} else if (isServiceOpen) {
					const anchorService = servicesManager?.getService(AnchorsDefinition)
					observersCleanup = anchorService!.observeAnchors(anchorsData)
				} else {
					observersCleanup = observeAnchors()
				}
			}
		},
		pageWillUnmount(): void {
			if (observersCleanup) {
				observersCleanup()
			}
		},
	}
}

export const PageAnchors = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		BrowserWindowSymbol,
		Props,
		pageIdSym,
		ExperimentsSymbol,
		DomSelectorsSymbol,
		optional(PageServicesManagerSymbol),
	],
	pageAnchorsFactory
)
