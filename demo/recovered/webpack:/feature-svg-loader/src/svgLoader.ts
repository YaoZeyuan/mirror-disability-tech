import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type {
	IPageWillMountHandler,
	IPropsStore,
	ILogger,
	INavigationManager,
	BrowserWindow,
	Experiments,
} from '@wix/thunderbolt-symbols'
import {
	PageFeatureConfigSymbol,
	Props,
	LoggerSymbol,
	NavigationManagerSymbol,
	BrowserWindowSymbol,
	ExperimentsSymbol,
} from '@wix/thunderbolt-symbols'
import type { SvgLoaderPageConfig, ISvgContentBuilder } from './types'
import { SvgContentBuilderSymbol, name } from './symbols'
import { isSSR } from '@wix/thunderbolt-commons'
import { createSvgProps, resolveVectorArtInProps, updateSvgProps } from './helpers'
import _ from 'lodash'

export const SvgLoader = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		SvgContentBuilderSymbol,
		Props,
		LoggerSymbol,
		NavigationManagerSymbol,
		BrowserWindowSymbol,
		ExperimentsSymbol,
	],
	(
		pageFeatureConfig: SvgLoaderPageConfig,
		svgContentBuilder: ISvgContentBuilder,
		propsStore: IPropsStore,
		logger: ILogger,
		navigationManager: INavigationManager,
		window: NonNullable<BrowserWindow>,
		experiments: Experiments
	): IPageWillMountHandler => {
		return {
			name: 'svgLoader',
			async pageWillMount() {
				const { compIdToSvgDataMap, compIdToVectorArtPropsPaths } = pageFeatureConfig
				const isClient = !isSSR(window)
				const shouldGetSvgFromNetwork = Boolean(experiments['specs.thunderbolt.fetchSVGfromNetworkInCSR'])
				const shouldGetSvgFromDOM = isClient && !shouldGetSvgFromNetwork

				const loadSvgContentForLegacyComps = (): Array<Promise<void>> => {
					return _.map(compIdToSvgDataMap, async (svgData, compId) => {
						const { componentType } = svgData
						// Get the svg data from the DOM on client side, if on server or if there's a client fallback, fetch it from svgContentBuilder
						const svgDataResult =
							(shouldGetSvgFromDOM &&
								(await logger.runAndReport(
									() => svgContentBuilder.getSvgFromDOM({ ...svgData, compId }),
									'svgLoader',
									'getSvgFromDOM'
								))) ||
							(await svgContentBuilder.getSvgFromNetwork({ ...svgData, compId }))
						if (svgDataResult) {
							const svgProps = createSvgProps(componentType, svgDataResult)
							updateSvgProps(compId, svgProps, propsStore)
						} else {
							logger.captureError(new Error(`Failed to load svg content for compId: ${compId}`), {
								tags: { feature: name, compId },
							})
						}
					})
				}
				const loadSvgContentForBuilderComps = (): Array<Promise<void>> => {
					return _.map(compIdToVectorArtPropsPaths, async (vectorArtPropsPaths, builderComponentId) => {
						const props = propsStore.get(builderComponentId)
						if (shouldGetSvgFromDOM) {
							await logger.runAndReport(
								() =>
									resolveVectorArtInProps(
										props,
										vectorArtPropsPaths,
										svgContentBuilder.getSvgFromDOM,
										builderComponentId
									),
								'svgLoader',
								'getSvgFromDOM_BuilderComponents'
							)
						} else {
							await resolveVectorArtInProps(
								props,
								vectorArtPropsPaths,
								svgContentBuilder.getSvgFromNetwork,
								builderComponentId
							)
						}
						if (props) {
							updateSvgProps(builderComponentId, props, propsStore)
						} else {
							logger.captureError(new Error(`Failed to load svg content for compId: ${builderComponentId}`), {
								tags: { feature: name, builderComponentId },
							})
						}
					})
				}
				await logger.runAsyncAndReport(
					() => {
						return Promise.all([...loadSvgContentForLegacyComps(), ...loadSvgContentForBuilderComps()])
					},
					name,
					`loadSvgContent:${
						isClient ? (navigationManager.isFirstNavigation() ? 'client-first-page' : 'navigation') : 'ssr'
					}`
				)
			},
		}
	}
)
