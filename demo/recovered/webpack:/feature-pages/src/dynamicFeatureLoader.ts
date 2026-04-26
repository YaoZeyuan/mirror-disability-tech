import type { DynamicLoadFeature, FeatureName, ILogger } from '@wix/thunderbolt-symbols'
import { InitSymbol, pageIdSym, LoggerSymbol } from '@wix/thunderbolt-symbols'
import type { IocContainer, ProviderCreator } from '@wix/thunderbolt-ioc'
import type { ILoadFeatures } from '@wix/thunderbolt-features'
import { FeaturesLoaderSymbol } from '@wix/thunderbolt-features'
import type { IPageFeatureLoader } from './types'
import { createPromise } from '@wix/thunderbolt-commons'

const getCacheKey = (featureName: FeatureName, pageId: string) => `${featureName}_${pageId}`

export const pageFeatureLoader: ProviderCreator<IPageFeatureLoader> = (pageContainer: IocContainer) => {
	const featuresLoader = pageContainer.get<ILoadFeatures>(FeaturesLoaderSymbol)
	const logger = pageContainer.get<ILogger>(LoggerSymbol)
	const promiseCache: Partial<Record<string, Promise<any>>> = {}

	return () => {
		return {
			loadFeature: async <T>(featureName: FeatureName, symbol: symbol): Promise<T & DynamicLoadFeature> => {
				const existingApi = pageContainer.get<T & DynamicLoadFeature>(symbol)
				if (existingApi) {
					return existingApi
				}
				const pageId = pageContainer.get<string>(pageIdSym)
				const cacheKey = getCacheKey(featureName, pageId)

				if (promiseCache[cacheKey]) {
					return promiseCache[cacheKey] as Promise<T & DynamicLoadFeature>
				}

				logger.interactionStarted('dynamic_load_feature', { paramsOverrides: { cacheKey } })

				const { promise, resolver } = createPromise<T & DynamicLoadFeature>()
				promiseCache[cacheKey] = promise

				await featuresLoader.loadPageFeatures(pageContainer, [featureName])

				const featureInitializers = pageContainer.getAllNamed<T & DynamicLoadFeature>(InitSymbol, featureName)
				await Promise.all(featureInitializers.map(({ init }) => init(pageId)))
				const initalizedFeature = pageContainer.get<T & DynamicLoadFeature>(symbol)
				logger.interactionEnded('dynamic_load_feature', { paramsOverrides: { cacheKey } })

				resolver(initalizedFeature)
				promiseCache[cacheKey] = undefined

				return initalizedFeature
			},
		}
	}
}
