import type { SiteAssetsClient, SiteAssetsClientConfig } from '@wix/site-assets-client'
import { siteAssetsClientBuilder } from '@wix/site-assets-client'
import type {
	ProcessLevelSACFactoryParams,
	RequestLevelSACFactoryParams,
	SiteAssetsClientAdapter,
	TBSiteAssetsRequest,
} from './types'

import { toSiteAssetsRequest } from './adapters/siteAssetsRequestDomain'
import { toMetaSiteModel, toSitePagesModel } from './adapters/siteAssetsDomain'
import { toSiteAssetsHttpClient } from './adapters/fetch/siteAssetsHttpClient'
import { resolveFallbackStrategy } from './adapters/fallbackStrategy'
import { updateConfig } from './adapters/configResolvers'

export const createSiteAssetsClientAdapter =
	({
		fetchFn,
		config,
		siteAssetsMetricsReporter,
		manifests,
		moduleFetcher,
		onFailureDump = () => {},
		csmFetcher,
		siteAssetsRouterUrls,
		timeout,
		extendedTimeoutFlow,
	}: ProcessLevelSACFactoryParams) =>
	({
		siteAssetsVersions,
		dataFixersParams,
		requestUrl,
		siteScopeParams,
		beckyExperiments,
		fallbackStrategyOverride,
		staticHTMLComponentUrl,
		remoteWidgetStructureBuilderVersion,
		blocksBuilderManifestGeneratorVersion,
		deviceInfo,
		qaMode,
		testMode,
		debugMode,
		experiments,
		pilerExperiments,
		anywhereThemeOverride,
	}: RequestLevelSACFactoryParams): SiteAssetsClientAdapter => {
		const sitePagesModel = toSitePagesModel(dataFixersParams, siteScopeParams)
		const updatedConfig = updateConfig(experiments, config)
		const siteAssetsClient: SiteAssetsClient = siteAssetsClientBuilder(
			{
				httpClient: toSiteAssetsHttpClient(
					requestUrl,
					fetchFn,
					updatedConfig.moduleTopology.environment.siteAssetsServerUrl
				),
				moduleFetcher,
				metricsReporter: siteAssetsMetricsReporter,
			},
			updatedConfig,
			{
				sitePagesModel,
				metaSiteModel: toMetaSiteModel(dataFixersParams, siteScopeParams, csmFetcher?.fetchCsm),
			}
		)

		return {
			// result() returns a (Promise of) string or json depending on the content-type of the module output
			execute(request: TBSiteAssetsRequest, fallbackStrategy: string): Promise<string | any> {
				const siteAssetsFallbackStrategy = resolveFallbackStrategy(
					fallbackStrategyOverride,
					request.moduleParams.resourceType,
					fallbackStrategy
				)

				return siteAssetsClient
					.execute(
						toSiteAssetsRequest({
							request,
							modulesToHashes: manifests.node.modulesToHashes,
							siteAssetsVersions,
							pageJsonFileNames: sitePagesModel.pageJsonFileNames,
							siteScopeParams,
							experiments: {
								beckyExperiments,
								pilerExperiments: pilerExperiments || {},
							},
							versions: {
								remoteWidgetStructureBuilderVersion,
								blocksBuilderManifestGeneratorVersion,
							},
							deviceInfo,
							staticHTMLComponentUrl,
							modes: {
								qaMode,
								testMode,
								debugMode,
							},
							urls: {
								siteAssetsRouterUrls,
								anywhereThemeOverride,
							},
							timeout,
							fallbackStrategy: siteAssetsFallbackStrategy,
							extendedTimeoutFlow,
						})
					)
					.catch((e) => {
						const moduleName = request.moduleParams.moduleName
						const pageCompId = request.pageCompId
						onFailureDump({
							siteAssetsFailureMessage: e.message,
							moduleName,
							pageCompId,
							// add here as many data as you like
						})
						throw e
					})
					.then(({ result }) => result())
			},
			calcPublicModuleUrl(request: TBSiteAssetsRequest): string {
				return siteAssetsClient.getPublicUrl(
					toSiteAssetsRequest({
						request,
						modulesToHashes: manifests.node.modulesToHashes,
						siteAssetsVersions,
						pageJsonFileNames: sitePagesModel.pageJsonFileNames,
						siteScopeParams,
						experiments: {
							beckyExperiments,
							pilerExperiments,
						},
						versions: {
							remoteWidgetStructureBuilderVersion,
							blocksBuilderManifestGeneratorVersion,
						},
						deviceInfo,
						staticHTMLComponentUrl,
						modes: {
							qaMode,
							testMode,
						},
					})
				)
			},
			getInitConfig(): SiteAssetsClientConfig {
				return config
			},
		}
	}
