import { shouldOutlineCss } from '@wix/thunderbolt-commons'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	CssSiteAssetsParams,
	Experiments,
	ICssFetcher,
	IHeadContent,
	ILogger,
	IPageResourceFetcher,
	ViewerModel,
	SiteAssetsResources,
} from '@wix/thunderbolt-symbols'
import {
	CssFetcherSymbol,
	DomReadySymbol,
	ExperimentsSymbol,
	HeadContentSymbol,
	LoggerSymbol,
	PageResourceFetcherSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
} from '@wix/thunderbolt-symbols'
import { LocalClientCssFetcher } from './LocalClientPageStyleLoader'
import type { AssetsLoaderSiteConfig } from './types'
import { name } from './symbols'

const accCssResultObject: { [pageId: string]: { [compId: string]: { [featureName: string]: any } } } = {}

const accumulateCssResults = (pageId: string, cssResultObject: SiteAssetsResources['css']['cssResultObject']) => {
	if (!cssResultObject) {
		return
	}

	if (!(pageId in accCssResultObject)) {
		accCssResultObject[pageId] = {}
	}

	Object.entries(cssResultObject).forEach(([compId, featureCssResult]) => {
		if (!(compId in accCssResultObject[pageId])) {
			accCssResultObject[pageId][compId] = {}
		}
		accCssResultObject[pageId][compId] = {
			...accCssResultObject[pageId][compId],
			...featureCssResult,
		}
	})
}

const shouldAddCssObjectToWindow = (viewerModel: ViewerModel, pageId: string) =>
	viewerModel.siteAssets.modulesParams.css.shouldGetCssResultObject && pageId !== 'masterPage'

// compCssMappers has to be the last feature to run
const featuresToIgnoreList = ['stylableCss', 'compCssMappers']
const getFeaturesToRunInIsolation = (requestUrl: string, isStylableComponentInStructure: boolean) => {
	const featuresFromUrl = new URL(requestUrl).searchParams.get('cssFeaturesToRun')
	// validate that the features are alphanumeric, comma separated
	if (featuresFromUrl && /^[\w,-]+$/.test(featuresFromUrl)) {
		return featuresFromUrl.split(',')
	}
	return featuresToIgnoreList.filter((feature) => feature !== 'stylableCss' || isStylableComponentInStructure)
}

export type ILoadPageStyle = {
	load(pageId: string, loadComponentsPromise?: Promise<any>): Promise<void>
}

export const PageMainCssFetcher = withDependencies<ICssFetcher>(
	[PageResourceFetcherSymbol, ViewerModelSym],
	(pageResourceFetcher: IPageResourceFetcher, viewerModel: ViewerModel) => ({
		id: 'css',
		fetch: (pageId, cssModule = 'css', extraModuleParams) => {
			const fetchPromise = pageResourceFetcher.fetchResource<'css' | 'cssMappers' | 'componentManifestCss'>(
				pageId,
				cssModule,
				extraModuleParams
			)

			// Accumulate css results only if we need to get the page css
			if (viewerModel.siteAssets.modulesParams.css.shouldGetCssResultObject) {
				fetchPromise.then(({ cssResultObject }) => {
					accumulateCssResults(pageId, cssResultObject)
				})
			}
			return fetchPromise
		},
	})
)

export const toDomId = (id: string, pageId: string) => `${id}_${pageId}`

type CssModuleEntry = {
	id: string
	module: 'css' | 'cssMappers' | 'componentManifestCss'
	extraParams?: Partial<CssSiteAssetsParams>
}

function getCssModuleEntries(
	pageId: string,
	requestUrl: string,
	cssFetcherId: string,
	isStylableComponentInStructure: boolean,
	hasBuilderComponents: boolean
): Array<CssModuleEntry> {
	const entries: Array<CssModuleEntry> = []

	if (pageId === 'masterPage') {
		entries.push({ id: cssFetcherId, module: 'css' })
	} else {
		const featuresToRunInIsolation = getFeaturesToRunInIsolation(requestUrl, isStylableComponentInStructure)

		entries.push({
			id: 'css',
			module: 'css',
			extraParams: { featuresToIgnore: featuresToRunInIsolation.join(',') },
		})

		featuresToRunInIsolation.forEach((feature) => {
			entries.push({
				id: feature,
				module: feature === 'compCssMappers' ? 'cssMappers' : 'css',
				extraParams: { featuresToRun: feature },
			})
		})
	}

	if (hasBuilderComponents) {
		entries.push({ id: 'builder-components-css', module: 'componentManifestCss' })
	}

	return entries
}

async function getStyles(
	pageId: string,
	requestUrl: string,
	cssFetcher: ICssFetcher,
	isStylableComponentInStructure: boolean,
	hasBuilderComponents: boolean
) {
	const entries = getCssModuleEntries(
		pageId,
		requestUrl,
		cssFetcher.id,
		isStylableComponentInStructure,
		hasBuilderComponents
	)

	return Promise.all(
		entries.map(async ({ id, module, extraParams }) => {
			const result = await cssFetcher.fetch(pageId, module, extraParams)
			return { id, css: result.css }
		})
	)
}

function getCssLinkEntries(
	pageId: string,
	requestUrl: string,
	cssFetcherId: string,
	pageResourceFetcher: IPageResourceFetcher,
	isStylableComponentInStructure: boolean,
	hasBuilderComponents: boolean
) {
	const rawCssContentType = { contentType: 'text/css' as const }
	return getCssModuleEntries(
		pageId,
		requestUrl,
		cssFetcherId,
		isStylableComponentInStructure,
		hasBuilderComponents
	).map(({ id, module, extraParams }) => ({
		id,
		url: pageResourceFetcher.getResourceUrl(pageId, module, { ...rawCssContentType, ...extraParams }),
	}))
}

export const ClientPageStyleLoader = withDependencies<ILoadPageStyle>(
	[
		DomReadySymbol,
		CssFetcherSymbol,
		ViewerModelSym,
		ExperimentsSymbol,
		LoggerSymbol,
		named(SiteFeatureConfigSymbol, name),
	],
	(
		domReadyPromise: Promise<void>,
		cssFetcher: ICssFetcher,
		viewerModel: ViewerModel,
		experiments: Experiments,
		logger: ILogger,
		{ isStylableComponentInStructure, hasBuilderComponents }: AssetsLoaderSiteConfig
	) => {
		return {
			async load(pageId, loadComponentsPromise?: Promise<any>): Promise<void> {
				await domReadyPromise
				await logger.runAsyncAndReport(
					async () => {
						if (viewerModel.siteAssets.modulesParams.css.shouldRunCssInBrowser) {
							return LocalClientCssFetcher(cssFetcher, pageId, viewerModel)
						}
						// If SSR already added the css, no need to fetch it again
						if (document.getElementById(toDomId(cssFetcher.id, pageId))) {
							return
						}

						const styles = await getStyles(
							pageId,
							viewerModel.requestUrl,
							cssFetcher,
							isStylableComponentInStructure,
							hasBuilderComponents
						)

						loadComponentsPromise && (await loadComponentsPromise)

						styles.forEach(({ id, css }) => {
							const styleElement = window.document.createElement('style')
							styleElement.setAttribute('id', toDomId(id, pageId))
							styleElement.innerHTML = css
							window.document.head.appendChild(styleElement)
						})

						if (shouldAddCssObjectToWindow(viewerModel, pageId)) {
							window.debugCssObject = accCssResultObject
						}
					},

					'ClientPageStyleLoader',
					'fetchClientCss'
				)
			},
		}
	}
)

export const ServerPageStyleLoader = withDependencies<ILoadPageStyle>(
	[
		HeadContentSymbol,
		CssFetcherSymbol,
		LoggerSymbol,
		ViewerModelSym,
		ExperimentsSymbol,
		named(SiteFeatureConfigSymbol, name),
		PageResourceFetcherSymbol,
	],
	(
		headContent: IHeadContent,
		cssFetcher: ICssFetcher,
		logger: ILogger,
		viewerModel: ViewerModel,
		experiments: Experiments,
		{ isStylableComponentInStructure, hasBuilderComponents }: AssetsLoaderSiteConfig,
		pageResourceFetcher: IPageResourceFetcher
	) => {
		return {
			async load(pageId) {
				await logger.runAsyncAndReport(
					async () => {
						if (shouldOutlineCss(experiments, viewerModel.siteFeaturesConfigs.seo.isInSEO, viewerModel.requestUrl)) {
							getCssLinkEntries(
								pageId,
								viewerModel.requestUrl,
								cssFetcher.id,
								pageResourceFetcher,
								isStylableComponentInStructure,
								hasBuilderComponents
							).forEach(({ id, url }) => {
								headContent.addPageCss(`<link id="${toDomId(id, pageId)}" href="${url}" rel="stylesheet"/>`)
							})
							return
						}

						const styles = await getStyles(
							pageId,
							viewerModel.requestUrl,
							cssFetcher,
							isStylableComponentInStructure,
							hasBuilderComponents
						)
						styles.forEach(({ id, css }) => {
							headContent.addPageCss(`<style id="${toDomId(id, pageId)}">${css}</style>`)
						})

						// add script tag (hacky) to define debug css object on window
						if (shouldAddCssObjectToWindow(viewerModel, pageId)) {
							headContent.addPageCss(`<script>window.debugCssObject = ${JSON.stringify(accCssResultObject)}</script>`)
						}
					},
					'ServerPageStyleLoader',
					'fetchServerCss'
				)
			},
		}
	}
)
