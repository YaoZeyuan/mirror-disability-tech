import type { IocContainer } from '@wix/thunderbolt-ioc'
import type { RendererProps } from 'feature-react-renderer'
import type { Environment } from '@wix/thunderbolt-environment'
import { createEnvLoader } from '@wix/thunderbolt-environment'
import {
	MasterPageFeatureConfigSymbol,
	PageAssetsLoaderSymbol,
	RendererSymbol,
	DynamicModelSymbol,
	FetchAccessTokensSymbol,
	BrowserWindowSymbol,
	TBReadySymbol,
	SessionModelSymbol,
} from '@wix/thunderbolt-symbols'
import type {
	BIReporter,
	DynamicSessionModel,
	FetchDynamicModel,
	FeatureName,
	IFetchApi,
	ILogger,
	IPageAssetsLoader,
	IRenderer,
	BrowserWindow,
	TBReady,
} from '@wix/thunderbolt-symbols'
import { taskify, yieldToMain } from '@wix/thunderbolt-commons'
import type { IThunderbolt, IThunderboltInitializer } from './types'
import { Thunderbolt } from './symbols'

const RENDERER_FEATURES: Set<FeatureName> = new Set([
	'renderer',
	'ooi',
	'componentsLoader',
	'stores',
	'domSelectors',
	'translations',
	'businessLogger',
	'assetsLoader',
	'sessionManager',
	'consentPolicy',
	'commonConfig',
	'componentsReact',
	'router',
	'navigationManager',
	'warmupData',
	'usedPlatformApis',
	'thunderboltInitializer',
	'protectedPages',
])

let storedVisitorId = ''

export const loadMasterPageFeaturesConfigs = async (container: IocContainer) => {
	// This adds the master page structure and props to the fetchCache
	const assetsLoader = await container.getAsync<IPageAssetsLoader>(PageAssetsLoaderSymbol)
	const siteFeaturesConfigs = await assetsLoader.load('masterPage').siteFeaturesConfigs

	Object.entries(siteFeaturesConfigs).forEach(([featureName, featureConfig]) => {
		container.bind(MasterPageFeatureConfigSymbol).toConstantValue(featureConfig).whenTargetNamed(featureName)
	})
}

const loadDynamicModel = ({
	accessTokensHandler,
	biReporter,
	logger,
	window,
}: {
	accessTokensHandler?: FetchDynamicModel
	biReporter: BIReporter
	logger: ILogger
	fetchApi: IFetchApi
	window: NonNullable<BrowserWindow>
}) => {
	const applyModelData = ({ visitorId, siteMemberId }: DynamicSessionModel) => {
		biReporter.setDynamicSessionData({ visitorId, siteMemberId })
	}
	const onDynamicModelError = (e: Error, attempt: number) =>
		logger.captureError(e, {
			tags: { feature: 'feature-thunderbolt-initializer', fetchFail: 'dynamicModel' },
			extra: { errorMessage: e.message, attempt },
		})

	let dynamicModelPromise = window.dynamicModelPromise

	const isHardenFetchAndXHR =
		window.viewerModel.experiments['specs.thunderbolt.hardenFetchAndXHR'] && !!accessTokensHandler

	if (isHardenFetchAndXHR) {
		dynamicModelPromise = accessTokensHandler()
	}

	// @ts-expect-error
	window?.sentryBuffer?.forEach((error: Error) => {
		logger.captureError(error, { tags: { feature: 'sentryBuffer' } })
	})

	return dynamicModelPromise
		.then((dynamicModel) => {
			applyModelData(dynamicModel as DynamicSessionModel)
			return dynamicModel
		})
		.catch((err) => {
			onDynamicModelError(err, 1)

			if (!isHardenFetchAndXHR) {
				window.dynamicModelPromise = window.fetchDynamicModel()
			}

			dynamicModelPromise = isHardenFetchAndXHR ? accessTokensHandler() : window.dynamicModelPromise

			return dynamicModelPromise
				.then((dynamicModel) => {
					applyModelData(dynamicModel as DynamicSessionModel)
					return dynamicModel
				})
				.catch((e) => {
					onDynamicModelError(e, 2)
				})
		}) as Promise<DynamicSessionModel>
}

const cleanSensitiveSessionData = () => {
	window.viewerModel.siteFeaturesConfigs.sessionManager = {
		sessionModel: {},
	}
}

export const getThunderboltInitializer = (container: IocContainer): IThunderboltInitializer => {
	let environment: Environment | null = null

	const initializer: IThunderboltInitializer = {
		getRenderer: async <T>() => {
			const { specificEnvFeaturesLoaders, biReporter, viewerModel, fetchApi, logger } = environment!
			try {
				logger.phaseStarted('loadSiteFeatures_renderFeaturesOnly')
				await yieldToMain()
				await specificEnvFeaturesLoaders.loadSiteFeatures(
					container,
					viewerModel.siteFeatures.filter((x) => RENDERER_FEATURES.has(x))
				)

				logger.phaseEnded('loadSiteFeatures_renderFeaturesOnly')
				logger.phaseStarted('loadMasterPageFeaturesConfigs')
				await yieldToMain()
				await loadMasterPageFeaturesConfigs(container)
				await yieldToMain()
				logger.phaseEnded('loadMasterPageFeaturesConfigs')

				container
					.bind(SessionModelSymbol)
					.toConstantValue(
						process.env.browser
							? container.get(BrowserWindowSymbol)?.viewerModel?.siteFeaturesConfigs?.sessionManager?.sessionModel || {}
							: {}
					)

				if (process.env.browser) {
					const window: NonNullable<BrowserWindow> = container.get(BrowserWindowSymbol)

					const { isRunningInDifferentSiteContext, visitorId } = window.viewerModel.siteFeaturesConfigs.sessionManager

					logger.phaseStarted('loadDynamicModel')

					const tbReady: TBReady = container.get(TBReadySymbol)
					const accessTokensHandler = await tbReady(window, logger, isRunningInDifferentSiteContext)
					const dynamicModel = await taskify(() =>
						loadDynamicModel({ accessTokensHandler, biReporter, logger, fetchApi, window })
					)
					container.bind(FetchAccessTokensSymbol).toConstantValue(accessTokensHandler)
					container.bind(DynamicModelSymbol).toConstantValue(dynamicModel)
					storedVisitorId = visitorId || dynamicModel?.visitorId
					cleanSensitiveSessionData()
					logger.phaseEnded('loadDynamicModel')
				}
			} catch (e) {
				logger.captureError(e, {
					tags: { feature: 'feature-thunderbolt-initializer', phase: 'get_renderer' },
					groupErrorsBy: 'values',
				})
				throw e
			}
			return container.getAsync<IRenderer<RendererProps, T>>(RendererSymbol)
		},
		loadEnvironment: (env) => {
			environment = env
			container.load(createEnvLoader(environment))
		},
		loadSiteFeatures: async () => {
			const { viewerModel, specificEnvFeaturesLoaders, logger } = environment!
			logger.phaseStarted('loadSiteFeatures')
			await taskify(() =>
				specificEnvFeaturesLoaders.loadSiteFeatures(
					container,
					viewerModel.siteFeatures.filter((x) => !RENDERER_FEATURES.has(x))
				)
			)
			logger.phaseEnded('loadSiteFeatures')
		},
		getThunderboltInvoker: async <T extends IThunderbolt>() => {
			return async () => {
				const { logger } = environment!
				logger.phaseStarted('container_get_thunderbolt')
				const thunderbolt =
					process.env.RENDERER_BUILD === 'react-native'
						? container.get<T>(Thunderbolt)
						: await container.getAsync<T>(Thunderbolt)
				logger.phaseEnded('container_get_thunderbolt')
				logger.phaseStarted('thunderbolt_ready')
				await taskify(() => thunderbolt.ready())
				logger.phaseEnded('thunderbolt_ready')
				return thunderbolt
			}
		},
	}

	return initializer
}

export const getVisitorId = () => storedVisitorId
