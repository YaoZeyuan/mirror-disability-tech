import { createSiteAssetsClientAdapter } from '../siteAssetsClientAdapter'
import type { Experiments, FetchFn, SiteAssetsClientTopology, ViewerModel } from '@wix/thunderbolt-symbols'
import type {
	SiteAssetsClientConfig,
	SiteAssetsMetricsReporter,
	SiteAssetsModuleFetcher,
	SiteAssetsTopology,
} from '@wix/site-assets-client'

import type {
	ClientSACFactoryParams,
	SiteAssetsClientAdapter,
	ToRequestLevelSACFactoryParamsFromSpreadedViewerModel,
} from '../types'
import { shouldRouteStagingRequest } from '../adapters/configResolvers'
import type { CsmFetcher } from '../fallback/csmFetcher'

const toSiteAssetsTopology = (clientTopology: SiteAssetsClientTopology): SiteAssetsTopology => {
	const {
		mediaRootUrl,
		staticMediaUrl,
		siteAssetsUrl,
		moduleRepoUrl,
		fileRepoUrl,
		viewerAppsUrl,
		viewerAssetsUrl,
		scriptsUrl,
	} = clientTopology

	return {
		mediaRootUrl,
		scriptsUrl,
		staticMediaUrl,
		siteAssetsServerUrl: siteAssetsUrl,
		moduleRepoUrl,
		fileRepoUrl,
		viewerAppsUrl,
		viewerAssetsUrl,
	}
}

export const toClientSACFactoryParams = ({
	viewerModel,
	fetchFn,
	siteAssetsMetricsReporter,
	moduleFetcher,
	csmFetcher,
}: {
	viewerModel: ViewerModel
	fetchFn: FetchFn
	siteAssetsMetricsReporter: SiteAssetsMetricsReporter
	moduleFetcher: SiteAssetsModuleFetcher
	experiments: Experiments
	csmFetcher?: CsmFetcher
}) => {
	const {
		requestUrl,
		siteAssets,
		fleetConfig,
		deviceInfo,
		mode: { qa: qaMode, debug: debugMode, enableTestApi: testMode },
		experiments,
		pilerExperiments,
		anywhereConfig,
	} = viewerModel

	return toClientSACFactoryParamsFrom({
		siteAssets,
		deviceInfo,
		qa: qaMode,
		enableTestApi: testMode,
		debug: debugMode,
		requestUrl: anywhereConfig?.url || requestUrl,
		isStagingRequest: shouldRouteStagingRequest(fleetConfig),
		fetchFn,
		siteAssetsMetricsReporter,
		moduleFetcher,
		experiments,
		pilerExperiments,
		anywhereThemeOverride: anywhereConfig?.themeOverride,
		csmFetcher,
	})
}

export const toClientSACFactoryParamsFrom = ({
	siteAssets,
	requestUrl,
	qa,
	enableTestApi,
	debug,
	deviceInfo,
	fetchFn,
	siteAssetsMetricsReporter,
	moduleFetcher,
	isStagingRequest,
	experiments,
	pilerExperiments,
	anywhereThemeOverride,
	csmFetcher,
}: ToRequestLevelSACFactoryParamsFromSpreadedViewerModel & {
	isStagingRequest?: boolean
	moduleFetcher: SiteAssetsModuleFetcher
	siteAssetsMetricsReporter: SiteAssetsMetricsReporter
	fetchFn: FetchFn
	csmFetcher?: CsmFetcher
}) => {
	const {
		clientTopology,
		manifests,
		siteAssetsVersions,
		dataFixersParams,
		siteScopeParams,
		beckyExperiments,
		staticHTMLComponentUrl,
		remoteWidgetStructureBuilderVersion,
		blocksBuilderManifestGeneratorVersion,
	} = siteAssets

	return {
		fetchFn,
		clientTopology,
		siteAssetsMetricsReporter,
		manifests,
		siteAssetsVersions,
		timeout: 4000,
		dataFixersParams,
		requestUrl,
		siteScopeParams,
		moduleFetcher,
		isStagingRequest,
		beckyExperiments,
		staticHTMLComponentUrl,
		remoteWidgetStructureBuilderVersion,
		blocksBuilderManifestGeneratorVersion,
		deviceInfo,
		qaMode: qa,
		testMode: enableTestApi,
		debugMode: debug,
		experiments,
		pilerExperiments: pilerExperiments || {},
		anywhereThemeOverride,
		csmFetcher,
	}
}

export const createClientSAC = ({
	fetchFn,
	clientTopology,
	siteAssetsMetricsReporter,
	manifests,
	siteAssetsVersions,
	timeout,
	dataFixersParams,
	requestUrl,
	siteScopeParams,
	moduleFetcher,
	isStagingRequest,
	beckyExperiments,
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
	csmFetcher,
}: ClientSACFactoryParams): SiteAssetsClientAdapter => {
	const topology = toSiteAssetsTopology(clientTopology)
	const isBrowser = !!process.env.browser
	const config: SiteAssetsClientConfig = {
		moduleTopology: {
			publicEnvironment: topology,
			environment: topology,
		},
		staticsTopology: {
			timeout,
			baseURLs: clientTopology.pageJsonServerUrls,
		},
		isStagingRequest,
		artifactId: 'wix-thunderbolt-client',
		isBrowser,
	}

	return createSiteAssetsClientAdapter({
		fetchFn,
		config,
		siteAssetsMetricsReporter,
		manifests,
		moduleFetcher,
		csmFetcher,
		timeout: 4000,
	})({
		siteAssetsVersions,
		dataFixersParams,
		requestUrl,
		siteScopeParams,
		beckyExperiments,
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
	})
}
