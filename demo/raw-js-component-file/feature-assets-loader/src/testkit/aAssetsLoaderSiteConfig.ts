import type { AssetsLoaderSiteConfig } from '../types'

export const aAssetsLoaderSiteConfig = (
	partialSiteConfig: Partial<AssetsLoaderSiteConfig> = {}
): AssetsLoaderSiteConfig => ({
	isStylableComponentInStructure: false,
	hasBuilderComponents: false,
	...partialSiteConfig,
})
