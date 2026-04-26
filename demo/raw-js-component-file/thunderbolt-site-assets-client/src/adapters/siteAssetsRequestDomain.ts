import type { CustomRequestSource, FallbackStrategy, SiteAssetsRequest, SitePagesModel } from '@wix/site-assets-client'
import type { TBSiteAssetsRequest } from '../types'
import { filterBeckyExperiments, stringifyExperiments } from '../utils'
import type { SiteAssetsRouterUrls } from '@wix/thunderbolt-ssr-api'
import type {
	BuilderComponentCssSiteAssetsParams,
	BuilderComponentFeaturesSiteAssetsParams,
	BuilderComponentPlatformSiteAssetsParams,
	ComponentManifestCssSiteAssetsParams,
	CssMappersSiteAssetsParams,
	CssSiteAssetsParams,
	Experiments,
	FeaturesSiteAssetsParams,
	MobileAppBuilderSiteAssetsParams,
	ModulesToHashes,
	PilerSiteAssetsParams,
	PlatformSiteAssetsParams,
	SiteAssetsModuleName,
	SiteAssetsResourceType,
	SiteAssetsVersions,
	SiteMapSiteAssetsParams,
	SiteScopeParams,
	ViewerModel,
} from '@wix/thunderbolt-symbols'
import _ from 'lodash'

type OneOfSiteAssetsParams =
	| CssSiteAssetsParams
	| CssMappersSiteAssetsParams
	| PlatformSiteAssetsParams
	| FeaturesSiteAssetsParams
	| SiteMapSiteAssetsParams
	| MobileAppBuilderSiteAssetsParams
	| BuilderComponentFeaturesSiteAssetsParams
	| BuilderComponentCssSiteAssetsParams
	| BuilderComponentPlatformSiteAssetsParams
	| ComponentManifestCssSiteAssetsParams
	| PilerSiteAssetsParams

type SiteAssetsParamsMap<U> = { [K in SiteAssetsResourceType]: U extends { resourceType: K } ? U : never }
type SiteAssetsParamsTypeMap = SiteAssetsParamsMap<OneOfSiteAssetsParams>
type Pattern<T> = { [K in keyof SiteAssetsParamsTypeMap]: (params: SiteAssetsParamsTypeMap[K]) => T }
function matcher<T>(pattern: Pattern<T>): (params: OneOfSiteAssetsParams) => T {
	// https://github.com/Microsoft/TypeScript/issues/14107
	return (params) => pattern[params.resourceType](params as any)
}

const MAPPERS_ONLY_PARAMS = ['ooiVersions']

const getBaseCssParams = (
	deviceInfo: ViewerModel['deviceInfo'],
	shouldRunVsm: CssSiteAssetsParams['shouldRunVsm'],
	shouldRunCssInBrowser: CssSiteAssetsParams['shouldRunCssInBrowser'],
	shouldGetCssResultObject: CssSiteAssetsParams['shouldGetCssResultObject']
) => {
	return {
		deviceType: deviceInfo.deviceClass,
		...(shouldRunVsm && { shouldRunVsm: 'true' }),
		...(shouldRunCssInBrowser && { shouldReturnResolvedBeckyModel: 'true' }),
		...(shouldGetCssResultObject && { shouldGetCssResultObject: 'true' }),
	}
}

export const getUniqueParamsPerModule = ({
	deviceInfo,
	staticHTMLComponentUrl,
	qaMode,
	testMode,
	debugMode,
	isMasterPage = false,
}: {
	deviceInfo: ViewerModel['deviceInfo']
	staticHTMLComponentUrl: string
	testMode?: ViewerModel['mode']['enableTestApi']
	qaMode?: ViewerModel['mode']['qa']
	debugMode?: ViewerModel['mode']['debug']
	isMasterPage?: boolean
}) => {
	return matcher<Record<string, string>>({
		// @ts-ignore
		css: ({
			stylableMetadataURLs,
			ooiVersions,
			shouldRunVsm,
			shouldRunCssInBrowser,
			featuresToRun,
			featuresToIgnore,
			shouldGetCssResultObject,
			builderAppVersions,
		}) => {
			const shouldIncludeStylableMetadata =
				isMasterPage ||
				(featuresToIgnore?.length && !featuresToIgnore?.includes('stylableCss')) ||
				featuresToRun?.includes('stylableCss')

			return _.pickBy(
				{
					...getBaseCssParams(deviceInfo, shouldRunVsm, shouldRunCssInBrowser, shouldGetCssResultObject),
					...(ooiVersions && { ooiVersions }),
					...(featuresToRun && { featuresToRun }),
					...(featuresToIgnore && { featuresToIgnore }),
					...(shouldIncludeStylableMetadata && {
						stylableMetadataURLs: JSON.stringify(stylableMetadataURLs || []),
					}),
					...(builderAppVersions && { builderAppVersions }),
				},
				(__, key) => isMasterPage || !MAPPERS_ONLY_PARAMS.includes(key)
			)
		},
		cssMappers: ({
			ooiVersions,
			shouldRunVsm,
			shouldRunCssInBrowser,
			featuresToRun,
			featuresToIgnore,
			shouldGetCssResultObject,
		}) => {
			return {
				...getBaseCssParams(deviceInfo, shouldRunVsm, shouldRunCssInBrowser, shouldGetCssResultObject),
				...(ooiVersions && { ooiVersions }),
				...(featuresToRun && { featuresToRun }),
				...(featuresToIgnore && { featuresToIgnore }),
			}
		},
		features: ({
			languageResolutionMethod,
			isMultilingualEnabled,
			externalBaseUrl,
			useSandboxInHTMLComp,
			disableStaticPagesUrlHierarchy,
			aboveTheFoldSectionsNum,
			isTrackClicksAnalyticsEnabled,
			isSocialElementsBlocked,
			builderAppVersions,
			onlyInteractions,
		}) => {
			return {
				languageResolutionMethod,
				isMultilingualEnabled: isMultilingualEnabled ? `${isMultilingualEnabled}` : 'false',
				isTrackClicksAnalyticsEnabled: isTrackClicksAnalyticsEnabled ? `${isTrackClicksAnalyticsEnabled}` : 'false',
				disableStaticPagesUrlHierarchy: disableStaticPagesUrlHierarchy ? `${disableStaticPagesUrlHierarchy}` : 'false',
				useSandboxInHTMLComp: `${useSandboxInHTMLComp}`,
				externalBaseUrl,
				deviceType: deviceInfo.deviceClass,
				staticHTMLComponentUrl,
				...(aboveTheFoldSectionsNum && { aboveTheFoldSectionsNum }),
				...(testMode && { testMode: 'true' }),
				...(qaMode && { qaMode: 'true' }),
				...(debugMode && { debugMode: 'true' }),
				...(isSocialElementsBlocked && { isSocialElementsBlocked: 'true' }),
				...(builderAppVersions && { builderAppVersions }),
				...(onlyInteractions && { onlyInteractions: 'true' }),
			}
		},
		platform: ({ externalBaseUrl }) => {
			return {
				staticHTMLComponentUrl,
				externalBaseUrl,
			}
		},
		siteMap: () => ({}),
		mobileAppBuilder: () => ({}),
		builderComponentFeatures: () => ({}),
		builderComponentCss: () => ({}),
		builderComponentPlatform: () => ({}),
		componentManifestCss: ({ builderAppVersions }) => ({
			...(builderAppVersions && { builderAppVersions }),
		}),
		pilerSiteAssets: ({ buildFullApp, keepWidgetBuild, modulesToHashes, nonBeckyModuleVersions }) => {
			return {
				buildFullApp,
				keepWidgetBuild,
				modulesToHashes,
				nonBeckyModuleVersions,
			}
		},
	})
}

export const getCommonParams = (
	{
		rendererType,
		freemiumBanner,
		coBrandingBanner,
		dayfulBanner,
		mobileActionsMenu,
		viewMode,
		isWixSite,
		hasTPAWorkerOnSite,
		isResponsive,
		wixCodePageIds,
		isPremiumDomain,
		migratingToOoiWidgetIds,
		registryLibrariesTopology,
		language,
		originalLanguage,
		isInSeo,
		appDefinitionIdToSiteRevision,
		formFactor,
		editorName,
		isClientSdkOnSite,
		appDefinitionIdsWithCustomCss,
		isBuilderComponentModel,
		hasUserDomainMedia,
		useViewerAssetsProxy,
	}: SiteScopeParams,
	{ errorPageId, pageCompId }: TBSiteAssetsRequest,
	beckyExperiments: Experiments,
	remoteWidgetStructureBuilderVersion: string,
	blocksBuilderManifestGeneratorVersion: string,
	anywhereThemeOverride?: string,
	pilerExperiments?: Experiments
) => {
	const isWixCodeOnPage = () =>
		`${
			// on responsive sites we do not fetch master page platform becky,
			// so we check for master page code in the single page request
			isResponsive
				? wixCodePageIds.includes('masterPage') || wixCodePageIds.includes(pageCompId)
				: wixCodePageIds.includes(pageCompId)
		}`

	const params = {
		rendererType,
		freemiumBanner: freemiumBanner ? `${freemiumBanner}` : undefined,
		coBrandingBanner: coBrandingBanner ? `${coBrandingBanner}` : undefined,
		dayfulBanner: dayfulBanner ? `${dayfulBanner}` : undefined,
		mobileActionsMenu: mobileActionsMenu ? `${mobileActionsMenu}` : undefined,
		isPremiumDomain: isPremiumDomain ? `${isPremiumDomain}` : undefined,
		isWixCodeOnPage: isWixCodeOnPage(),
		isWixCodeOnSite: `${wixCodePageIds.length > 0}`,
		isClientSdkOnSite,
		hasTPAWorkerOnSite: `${hasTPAWorkerOnSite}`,
		viewMode: viewMode || undefined,
		isWixSite: isWixSite ? `${isWixSite}` : undefined,
		errorPageId: errorPageId || undefined,
		isResponsive: isResponsive ? `${isResponsive}` : undefined,
		beckyExperiments: stringifyExperiments(beckyExperiments) || undefined,
		remoteWidgetStructureBuilderVersion,
		blocksBuilderManifestGeneratorVersion,
		migratingToOoiWidgetIds,
		registryLibrariesTopology:
			registryLibrariesTopology && registryLibrariesTopology.length
				? JSON.stringify(registryLibrariesTopology)
				: undefined,
		language,
		originalLanguage,
		isInSeo: isInSeo ? `${isInSeo}` : 'false',
		appDefinitionIdToSiteRevision: Object.keys(appDefinitionIdToSiteRevision).length
			? JSON.stringify(appDefinitionIdToSiteRevision)
			: undefined,
		anywhereThemeOverride,
		formFactor,
		editorName,
		appDefinitionIdsWithCustomCss:
			appDefinitionIdsWithCustomCss && appDefinitionIdsWithCustomCss.length > 0
				? JSON.stringify(appDefinitionIdsWithCustomCss)
				: undefined,
		isBuilderComponentModel: isBuilderComponentModel ? `${isBuilderComponentModel}` : 'false',
		pilerExperiments: stringifyExperiments(pilerExperiments || {}),
		hasUserDomainMedia: hasUserDomainMedia ? 'true' : 'false',
		useViewerAssetsProxy: useViewerAssetsProxy ? 'true' : undefined,
	}
	return Object.entries(params).reduce(
		(returnValue, [key, value]) => (value ? { ...returnValue, [key]: value } : returnValue),
		{}
	)
}

export interface ToSiteAssetsRequestParams {
	request: TBSiteAssetsRequest
	modulesToHashes: ModulesToHashes
	siteAssetsVersions: SiteAssetsVersions
	pageJsonFileNames: SitePagesModel['pageJsonFileNames']
	siteScopeParams: SiteScopeParams
	experiments: {
		beckyExperiments: Experiments
		pilerExperiments?: Experiments
	}
	versions: {
		remoteWidgetStructureBuilderVersion: string
		blocksBuilderManifestGeneratorVersion: string
	}
	deviceInfo: ViewerModel['deviceInfo']
	staticHTMLComponentUrl: string
	modes?: {
		qaMode?: boolean
		testMode?: boolean
		debugMode?: boolean
	}
	urls?: {
		siteAssetsRouterUrls?: SiteAssetsRouterUrls
		anywhereThemeOverride?: string
	}
	timeout?: number
	fallbackStrategy?: FallbackStrategy
	extendedTimeoutFlow?: boolean
}

export function toSiteAssetsRequest({
	request,
	modulesToHashes,
	siteAssetsVersions,
	pageJsonFileNames,
	siteScopeParams,
	experiments: { beckyExperiments, pilerExperiments },
	versions: { remoteWidgetStructureBuilderVersion, blocksBuilderManifestGeneratorVersion },
	deviceInfo,
	staticHTMLComponentUrl,
	modes,
	urls,
	timeout,
	fallbackStrategy,
	extendedTimeoutFlow,
}: ToSiteAssetsRequestParams) {
	const qaMode = modes?.qaMode
	const testMode = modes?.testMode
	const debugMode = modes?.debugMode
	const siteAssetsRouterUrls = urls?.siteAssetsRouterUrls
	const anywhereThemeOverride = urls?.anywhereThemeOverride
	const { moduleParams, pageCompId, pageJsonFileName, bypassSsrInternalCache } = request
	const { contentType, moduleName } = moduleParams

	const siteAssetsRouterUrl = siteScopeParams.isInSeo ? siteAssetsRouterUrls?.seo : siteAssetsRouterUrls?.users

	const maybeUrlOverride = bypassSsrInternalCache && siteAssetsRouterUrl ? siteAssetsRouterUrl : undefined

	const filteredBeckyExperiments = filterBeckyExperiments(beckyExperiments, moduleName)

	const isMasterPage = pageCompId === 'masterPage'

	const commonParams = getCommonParams(
		siteScopeParams,
		request,
		filteredBeckyExperiments,
		remoteWidgetStructureBuilderVersion,
		blocksBuilderManifestGeneratorVersion,
		anywhereThemeOverride,
		pilerExperiments
	)

	const uniqueParams = getUniqueParamsPerModule({
		deviceInfo,
		staticHTMLComponentUrl,
		qaMode,
		testMode,
		debugMode,
		isMasterPage,
	})(moduleParams)

	const siteAssetsRequest: SiteAssetsRequest = {
		endpoint: {
			controller: 'pages',
			methodName: 'thunderbolt',
		},
		module: {
			name: moduleName,
			version: modulesToHashes[moduleName as SiteAssetsModuleName] || siteAssetsVersions[moduleName],
			fetchType: modulesToHashes[moduleName as SiteAssetsModuleName] ? 'file' : 'module',
			params: { ...commonParams, ...uniqueParams },
		},
		contentType,
		fallbackStrategy: fallbackStrategy || 'disable',
		pageJsonFileName: pageJsonFileName || pageJsonFileNames[pageCompId],
		pageId: pageCompId,
		...(siteScopeParams.disableSiteAssetsCache
			? { disableSiteAssetsCache: siteScopeParams.disableSiteAssetsCache }
			: {}),
		timeout,
		customRequestSource: siteScopeParams.isInSeo ? 'seo' : undefined,
		extendedTimeout: extendedTimeoutFlow,
		urlOverride: maybeUrlOverride,
		bypassSsrInternalCache,
	}

	return siteAssetsRequest
}
