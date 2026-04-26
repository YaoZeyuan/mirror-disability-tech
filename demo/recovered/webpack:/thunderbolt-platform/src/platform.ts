import _ from 'lodash'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'
import { multi, named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BusinessLogger,
	Experiments,
	IAppWillLoadPageHandler,
	ILogger,
	PlatformEnvDataProvider,
	PlatformSiteConfig,
	SdkHandlersProvider,
	ServiceProvider,
	ViewerModel,
	IPageProvider,
	IPageReflector,
} from '@wix/thunderbolt-symbols'
import {
	BusinessLoggerSymbol,
	CurrentRouteInfoSymbol,
	ExperimentsSymbol,
	LoggerSymbol,
	PlatformEnvDataProviderSymbol,
	ServiceProviderSymbol,
	SignalsServiceProviderSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
	WixCodeSdkHandlersProviderSym,
	PageProviderSymbol,
} from '@wix/thunderbolt-symbols'
import type { PlatformInitializer } from './types'
import { name, PlatformInitializerSym } from './symbols'
import type { DebugApis } from 'feature-debug'
import { TbDebugSymbol } from 'feature-debug'
import { createBootstrapData } from './viewer/createBootstrapData'
import type { ICurrentRouteInfo } from 'feature-router'
import { platformUpdatesFunctionsNames } from './constants'
import type { InvokeViewerHandler } from './core/types'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'
import { EventCategories } from '@wix/fe-essentials-viewer-platform/bi'
import { removeDuplicatesServices } from './utils/servicesUtils'

class PlatformError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PlatformError' // for grouping the errors in the rollout grafana
	}
}

export const Platform = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		PlatformInitializerSym,
		ViewerModelSym,
		LoggerSymbol,
		PageProviderSymbol,
		CurrentRouteInfoSymbol,
		BusinessLoggerSymbol,
		multi(ServiceProviderSymbol),
		multi(WixCodeSdkHandlersProviderSym),
		multi(PlatformEnvDataProviderSymbol),
		NavigationManagerSymbol,
		ExperimentsSymbol,
		optional(SignalsServiceProviderSymbol),
		optional(LightboxUtilsSymbol),
		optional(TbDebugSymbol),
	],
	(
		platformSiteConfig: PlatformSiteConfig,
		platformRunnerContext: PlatformInitializer,
		viewerModel: ViewerModel,
		logger: ILogger,
		pageProvider: IPageProvider,
		currentRouteInfo: ICurrentRouteInfo,
		businessLogger: BusinessLogger,
		serviceProviders: Array<ServiceProvider>,
		siteHandlersProviders: Array<SdkHandlersProvider<any>>,
		platformEnvDataProviders: Array<PlatformEnvDataProvider>,
		navigationManager: INavigationManager,
		experiments: Experiments,
		signalsServiceProvider?: ServiceProvider,
		popupUtils?: ILightboxUtils,
		debugApi?: DebugApis
	): IAppWillLoadPageHandler => {
		const siteHandlers = Object.assign(
			{},
			...siteHandlersProviders.map((siteHandlerProvider) => siteHandlerProvider.getSdkHandlers())
		)

		async function getHandlers(page: IPageReflector) {
			const pageHandlersProviders =
				await page.getAllImplementersOfAsync<SdkHandlersProvider<any>>(WixCodeSdkHandlersProviderSym)
			const pageHandlers = pageHandlersProviders.map((pageHandlerProvider) => pageHandlerProvider.getSdkHandlers())
			return Object.assign({}, ...pageHandlers, siteHandlers)
		}

		async function getPlatformEnvData(currentPageId?: string) {
			const envDataArray = await Promise.all(
				platformEnvDataProviders.map((envApiProvider) => envApiProvider.platformEnvData?.(currentPageId))
			)
			return Object.assign({}, ...envDataArray)
		}
		const {
			bootstrapData: siteConfigBootstrapData,
			debug: { disablePlatform },
			isBuilderComponentModel,
		} = platformSiteConfig

		getPlatformEnvData().then((platformEnvData) => {
			const siteBootstrapData = createBootstrapData({
				platformEnvData,
				platformBootstrapData: siteConfigBootstrapData,
				siteFeaturesConfigs: viewerModel.siteFeaturesConfigs,
				currentContextId: 'site',
				currentPageId: 'site',
				experiments: viewerModel.experiments,
				isBuilderComponentModel,
			})

			platformRunnerContext.initPlatformOnSite(siteBootstrapData, (path: string, ...args: Array<unknown>) => {
				const handler = _.get(siteHandlers, path)

				if (!_.isFunction(handler)) {
					const error = new PlatformError('site handler does not exist in page')
					logger.captureError(error, {
						tags: {
							feature: 'platform',
							handler: path,
						},
						level: 'info',
					})

					if (debugApi) {
						console.warn(error, path)
					}

					return
				}

				return handler(...args)
			})
		})

		return {
			name: 'platform',
			async appWillLoadPage({ pageId: currentPageId, contextId }) {
				// Getting envData on each navigation so it can depend on currentUrl.
				const sitePlatformEnvData = await getPlatformEnvData(currentPageId)
				const muteFedops = sitePlatformEnvData.bi.muteFedops
				if (!muteFedops) {
					logger.interactionStarted('platform')
				}

				const pagesPromise = Promise.all([
					pageProvider(contextId, currentPageId),
					pageProvider('masterPage', 'masterPage'),
				])

				const pagePlatformEnvDataPromise = pagesPromise
					.then(async ([page, masterPage]) => {
						const pageEnvDataProviders =
							await page.getAllImplementersOnPageOfAsync<PlatformEnvDataProvider>(PlatformEnvDataProviderSymbol)
						const masterPageEnvDataProviders =
							await masterPage.getAllImplementersOnPageOfAsync<PlatformEnvDataProvider>(PlatformEnvDataProviderSymbol)

						const allPageProviders = [...pageEnvDataProviders, ...masterPageEnvDataProviders]
						const envDataArray = await Promise.all(
							allPageProviders.map((provider) => provider.platformEnvData?.(currentPageId))
						)

						return Object.assign({}, ...envDataArray)
					})
					.catch((e) => {
						logger.captureError(new PlatformError('page platform env data providers could not be resolved'), {
							tags: {
								feature: 'platform',
							},
							extra: {
								error: e,
							},
						})
						return {}
					})

				const handlersPromise = pagesPromise
					.then(async ([page, masterPage]) => ({
						masterPageHandlers: await getHandlers(masterPage),
						pageHandlers: await getHandlers(page),
					}))
					.catch((e) => {
						logger.captureError(new PlatformError('viewer handlers could not be resolved'), {
							tags: {
								feature: 'platform',
							},
							extra: {
								error: e,
							},
						})
						return { pageHandlers: {}, masterPageHandlers: {} }
					})

				const isServicesInfra = experiments['specs.thunderbolt.servicesInfra'] || isBuilderComponentModel
				const registeredServicesPromise = !isServicesInfra
					? Promise.resolve([])
					: pagesPromise
							.then(async ([page, masterPage]) => {
								const pageServices = (await page.getAllImplementersOnPageOfAsync(
									ServiceProviderSymbol
								)) as Array<ServiceProvider>
								const masterPageServices = (await masterPage.getAllImplementersOnPageOfAsync(
									ServiceProviderSymbol
								)) as Array<ServiceProvider>

								return removeDuplicatesServices(
									pageServices.concat(masterPageServices).concat(serviceProviders).concat(signalsServiceProvider!)
								)
							})
							.catch((e) => {
								logger.captureError(new PlatformError('services could not be resolved'), {
									tags: {
										feature: 'platform',
									},
									extra: {
										error: e,
									},
								})
								return []
							})

				if (disablePlatform) {
					return
				}

				const [registeredServices, pagePlatformEnvData] = await Promise.all([
					registeredServicesPromise,
					pagePlatformEnvDataPromise,
				])

				const platformEnvData = sitePlatformEnvData
				if (pagePlatformEnvData.builderComponentsImportMapSdkUrls) {
					platformEnvData.builderComponentsImportMapSdkUrls = pagePlatformEnvData.builderComponentsImportMapSdkUrls
				}
				if (pagePlatformEnvData.builderComponentsCompTypeSdkUrls) {
					platformEnvData.builderComponentsCompTypeSdkUrls = pagePlatformEnvData.builderComponentsCompTypeSdkUrls
				}

				const bootstrapData = createBootstrapData({
					platformEnvData,
					platformBootstrapData: siteConfigBootstrapData,
					siteFeaturesConfigs: viewerModel.siteFeaturesConfigs,
					currentContextId: contextId,
					currentPageId,
					experiments: viewerModel.experiments,
					registeredServices,
					isBuilderComponentModel,
				})

				const shouldIgnoreCall = () =>
					contextId !== 'masterPage' &&
					!popupUtils?.isLightbox(contextId) &&
					contextId !== currentRouteInfo.getCurrentRouteInfo()?.contextId

				const invokeViewerHandler: InvokeViewerHandler = async (
					pageId: string,
					path: Array<string>,
					...args: Array<never>
				) => {
					// #TB-3031 Ignore invocations from handlers that were created on other pages
					// Limiting only setControllerProps and updateProps for tracking events to pass through during navigations
					const functionName = _.last(path) as string
					if (platformUpdatesFunctionsNames.includes(functionName) && shouldIgnoreCall()) {
						return
					}

					const { masterPageHandlers, pageHandlers } = await handlersPromise
					const handlers = pageId === 'masterPage' ? masterPageHandlers : pageHandlers
					const handler = _.get(handlers, path)

					if (!_.isFunction(handler)) {
						const error = new PlatformError('handler does not exist in page')
						logger.captureError(error, {
							tags: {
								feature: 'platform',
								handler: functionName,
								isLightbox: platformEnvData.bi.pageData.isLightbox,
								isDuringNavigation: navigationManager.isDuringNavigation(),
								isMasterPage: pageId === 'masterPage',
							},
							extra: { pageId, contextId, path: path.join('.') },
							level: 'info',
						})

						if (debugApi) {
							console.warn(error, pageId, path)
						}

						return
					}

					return handler(...args)
				}

				if (debugApi) {
					debugApi.platform.logBootstrapMessage(contextId, bootstrapData)
				}

				logger.phaseStarted('platform', {}, { pageId: currentPageId, shouldReportSsrBi: true })
				await platformRunnerContext.runPlatformOnPage(bootstrapData, invokeViewerHandler)
				logger.phaseEnded('platform', {}, { shouldReportSsrBi: true })

				if (!muteFedops) {
					logger.interactionEnded('platform')
				}
			},
		}
	}
)
