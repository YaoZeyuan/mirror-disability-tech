import type { ILoadFeatures } from '@wix/thunderbolt-features'
import type { Identifier, IocContainer } from '@wix/thunderbolt-ioc'
import type { FeaturesConfig, IPageAssetsLoader, IPageReflector } from '@wix/thunderbolt-symbols'
import {
	contextIdSymbol,
	PageFeatureConfigsSymbol,
	PageFeatureConfigSymbol,
	PageFeatureLoaderSym,
	pageIdSym,
} from '@wix/thunderbolt-symbols'
import type { IPageFeatureLoader } from './types'
import { yieldToMain } from '@wix/thunderbolt-commons'
import { pageFeatureLoader } from './dynamicFeatureLoader'

const bindFeaturesConfig = (container: IocContainer, featuresConfig: FeaturesConfig) => {
	Object.keys(featuresConfig).forEach((key) => {
		container
			.bind(PageFeatureConfigSymbol)
			.toConstantValue(featuresConfig[key as keyof FeaturesConfig])
			.whenTargetNamed(key)
	})
}

export const createPageContainer = async ({
	container,
	pageId,
	contextId,
	pageAssetsLoader,
	featuresLoader,
}: {
	container: IocContainer
	pageId: string
	contextId: string
	pageAssetsLoader: IPageAssetsLoader
	featuresLoader: ILoadFeatures
}) => {
	await yieldToMain()
	const { features, props } = await pageAssetsLoader.load(pageId)
	await yieldToMain()
	const pageContainer = container.createChild()
	await featuresLoader.loadPageFeatures(pageContainer, await features)
	const pageFeatureConfigs = await props
	bindFeaturesConfig(pageContainer, pageFeatureConfigs)

	pageContainer.bind(PageFeatureConfigsSymbol).toConstantValue(pageFeatureConfigs)
	pageContainer.bind<string>(pageIdSym).toConstantValue(pageId)
	pageContainer.bind<string>(contextIdSymbol).toConstantValue(contextId)
	pageContainer.bind(PageFeatureLoaderSym).toProvider<IPageFeatureLoader>(pageFeatureLoader)

	return pageContainer
}

export const createPageReflector = (
	pageContainer: IocContainer,
	masterPageReflector?: IPageReflector
): IPageReflector => ({
	getAllImplementersOf<T>(identifier: Identifier): Array<T> {
		const pageInstances = pageContainer.getAll<T>(identifier)
		const masterPageInstance = masterPageReflector ? masterPageReflector.getAllImplementersOf<T>(identifier) : []
		return [...masterPageInstance, ...pageInstances]
	},
	getAllImplementersOnPageOf<T>(identifier: symbol): Array<T> {
		return pageContainer.getAll<T>(identifier)
	},
	async getAllImplementersOfAsync<T>(identifier: Identifier): Promise<Array<T>> {
		const pageInstances = pageContainer.getAll<T>(identifier)
		const masterPageInstance = masterPageReflector ? masterPageReflector.getAllImplementersOf<T>(identifier) : []
		return [...masterPageInstance, ...pageInstances]
	},
	async getAllImplementersOnPageOfAsync<T>(identifier: symbol): Promise<Array<T>> {
		return pageContainer.getAll<T>(identifier)
	},
})
