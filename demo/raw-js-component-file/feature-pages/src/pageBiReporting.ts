import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	Component,
	IAppDidMountHandler,
	ILogger,
	IPerfReporterApi,
	IStructureAPI,
	ViewerModel,
	IAppDidLoadPageHandler,
	INavigationManager,
} from '@wix/thunderbolt-symbols'
import {
	LoggerSymbol,
	PerfReporterSymbol,
	Structure,
	ViewerModelSym,
	NavigationManagerSymbol,
} from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import type { ILoadFeatures } from '@wix/thunderbolt-features'
import { FeaturesLoaderSymbol } from '@wix/thunderbolt-features'
import type { IOOICompData } from 'feature-ooi-tpa-shared-config'
import { OOICompDataSymbol } from 'feature-ooi-tpa-shared-config'
import { getClosestCompIdByHtmlElement, extractClosestCompTypeFromHtmlElement, isSSR } from '@wix/thunderbolt-commons'
import type { IWarmupDataProvider } from 'feature-warmup-data'
import { WarmupDataProviderSymbol } from 'feature-warmup-data'
import type { PageStructureWarmupData } from './types'
import { name } from './symbols'
import _ from 'lodash'

export default withDependencies<IAppDidMountHandler & IAppDidLoadPageHandler>(
	[
		FeaturesLoaderSymbol,
		ViewerModelSym,
		LoggerSymbol,
		Structure,
		WarmupDataProviderSymbol,
		NavigationManagerSymbol,
		DomSelectorsSymbol,
		optional(PerfReporterSymbol),
		optional(OOICompDataSymbol),
	],
	(
		featuresLoader: ILoadFeatures,
		viewerModel: ViewerModel,
		logger: ILogger,
		structureApi: IStructureAPI,
		warmupDataProvider: IWarmupDataProvider,
		navigationManager: INavigationManager,
		domSelectors: IDomSelectors,
		perfReporter?: IPerfReporterApi,
		ooiCompData?: IOOICompData
	) => {
		const compIdToTypeMap: { [compId: string]: string } = {}
		warmupDataProvider.getWarmupData<PageStructureWarmupData>(name).then((data) => {
			data && Object.assign(compIdToTypeMap, data.compIdToTypeMap)
		})
		return {
			appDidLoadPage() {
				Object.assign(
					compIdToTypeMap,
					_.mapValues(structureApi.getEntireStore(), (comp: Component) => comp.componentType)
				)
			},
			appDidMount: async () => {
				try {
					if (perfReporter) {
						const getCompDataByHtmlElement = (element: HTMLElement) => {
							const findClosestCompId = (currentElement: HTMLElement) => {
								let compId = getClosestCompIdByHtmlElement(currentElement)
								while (compId && !compIdToTypeMap[compId]) {
									const nextElement = domSelectors.getByCompId(compId)?.parentElement
									if (!nextElement) {
										break
									}
									compId = getClosestCompIdByHtmlElement(nextElement)
								}
								return compId
							}
							function runPredicateOnElementAndParentsRecursively(
								_element: HTMLElement,
								predicate: (element: HTMLElement) => boolean
							) {
								let node: any = _element
								while (node) {
									if (predicate(node)) {
										return true
									}
									node = node.parentElement
								}
								return false
							}
							const compId = findClosestCompId(element)
							const isAnimated = runPredicateOnElementAndParentsRecursively(element, (e) =>
								e.hasAttribute('data-motion-enter')
							)
							const isLightbox = runPredicateOnElementAndParentsRecursively(element, (e) => e.id === 'POPUPS_ROOT')
							const isWelcomeScreen = !!document.getElementById('welcome-screen')
							// When navigating, sometimes the onINP is being sent after the structure was updated but before the page was rendered.
							// This means we successfully extract the compId from the html, but the component is no longer in the structure.
							const compType =
								(compId && compIdToTypeMap[compId]) || extractClosestCompTypeFromHtmlElement(element) || 'not_found'
							const lcpCustomAttributes = [
								{
									name: 'lightbox', // the value in BI that will be sent
									key: 'id', // the key of the attribute in the html element
									value: 'POPUPS_ROOT', // the value of the attribute in the html element
									runOnAncestors: true,
								},
								{
									name: 'outside_of_main_container',
									runOnAncestors: false,
									predicate: (e: HTMLElement) => {
										const mainContainer = document.getElementById('SITE_CONTAINER')
										return (mainContainer && !mainContainer.contains(e)) || false
									},
								},
								{
									name: 'animated',
									key: 'data-motion-enter',
									value: 'done',
									runOnAncestors: true,
								},
								{
									name: 'consentPolicy',
									key: 'data-hook',
									value: 'consent-banner-root',
									runOnAncestors: true,
								},
								{
									name: 'loginPage',
									key: 'data-testid',
									value: 'siteMembersDialogLayout',
									runOnAncestors: true,
								},
								{
									name: 'videoPlayer',
									key: 'data-testid',
									value: 'playable-cover',
									runOnAncestors: true,
								},
								{
									name: 'welcomeScreen',
									runOnAncestors: false,
									predicate: () => !!(window as any).requestCloseWelcomeScreen,
								},
								{
									name: 'dialog',
									key: 'role',
									value: 'dialog',
									runOnAncestors: true,
								},
							]

							const lcpElementCustomAttributes = lcpCustomAttributes
								.filter(({ key, value, predicate, runOnAncestors }) => {
									const func = predicate || ((e: HTMLElement) => e.getAttribute(key) === value)
									return runOnAncestors ? runPredicateOnElementAndParentsRecursively(element, func) : func(element)
								})
								.map((item) => item.name)

							if (viewerModel.mode.debug) {
								console.log({ lcpElementCustomAttributes })
							}
							const basicData = {
								lcpElementCustomAttributes,
								isAnimated,
								isLightbox,
								isWelcomeScreen,
								compType: compType || 'comp_not_found_in_structure',
								navigationParams: {
									lastNavigationTimings: navigationManager.getLastNavigationTimings(),
									isDuringNavigation: navigationManager.isDuringNavigation(),
								},
							}
							if (compId && compType === 'tpaWidgetNative') {
								const ooiData = ooiCompData?.getCompDataByCompId(compId)
								return {
									widgetId: ooiData?.widgetId,
									appDefinitionId: ooiData?.appDefinitionId,
									...basicData,
								}
							}
							return basicData
						}
						if (!isSSR(window) && (process.env.NODE_ENV !== 'production' || viewerModel.mode.debug)) {
							// @ts-ignore
							window._getCompDataByHtmlElement = getCompDataByHtmlElement
						}

						perfReporter.update({ getHtmlElementMetadata: getCompDataByHtmlElement })
					}

					const features = [...featuresLoader.getLoadedPageFeatures(), ...viewerModel.siteFeatures]
					const components = Object.values(compIdToTypeMap)
					logger.meter('page_features_loaded', {
						customParams: {
							features,
							components,
						},
					})
				} catch (e) {
					// TODO handle thrown error
				}
			},
		}
	}
)
