import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { ResolutionMethod } from '@wix/thunderbolt-ssr-api'
import type {
	PlatformEnvDataProvider,
	IMultilingual,
	MultilingualSiteConfig,
	ICurrentLanguageAPI,
	IAppDidMountHandler,
	ILogger,
} from '@wix/thunderbolt-symbols'
import {
	SiteFeatureConfigSymbol,
	MultilingualCurrentLanguageSymbol,
	LoggerSymbol,
	FeatureExportsSymbol,
} from '@wix/thunderbolt-symbols'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'

import { name } from './symbols'

const getResolutionMethodForBI = (siteLanguages: MultilingualSiteConfig['siteLanguages']): ResolutionMethod => {
	const { resolutionMethod } =
		siteLanguages.find((language) => language.resolutionMethod !== 'QueryParam') || siteLanguages[0]

	return resolutionMethod
}

const multilingualFactory = (
	siteFeatureConfig: MultilingualSiteConfig,
	multilingualExports: IFeatureExportsStore<typeof name>,
	CurrentLanguageAPI: ICurrentLanguageAPI,
	logger: ILogger
): IMultilingual & PlatformEnvDataProvider & IAppDidMountHandler => {
	const { set: setCurrentLanguage, get: getCurrentLanguage } = CurrentLanguageAPI

	return {
		appDidMount: () => {
			multilingualExports.export({
				originalLanguageCode: siteFeatureConfig.originalLanguage.languageCode,
				currentLanguage: getCurrentLanguage(),
				siteLanguages: siteFeatureConfig.siteLanguages,
				flagsUrl: siteFeatureConfig.flagsUrl,
				setCurrentLanguage,
			})

			const translationLanguages = siteFeatureConfig.siteLanguages.reduce<Array<string>>((acc, { languageCode }) => {
				if (languageCode !== siteFeatureConfig.originalLanguage.languageCode) {
					acc.push(languageCode)
				}
				return acc
			}, [])

			logger.meter('multilingual_init', {
				customParams: {
					translationLanguages,
					currentLanguage: getCurrentLanguage().languageCode,
					hasLanguageSelector: siteFeatureConfig.hasLanguageSelector,
					mainLanguage: siteFeatureConfig.originalLanguage.languageCode,
					resolutionMethod: getResolutionMethodForBI(siteFeatureConfig.siteLanguages),
				},
			})
		},
		platformEnvData() {
			if (!siteFeatureConfig.isEnabled) {
				return {}
			}
			return {
				multilingual: {
					isOriginalLanguage: siteFeatureConfig.isOriginalLanguage,
					siteLanguages: siteFeatureConfig.siteLanguages,
					currentLanguage: getCurrentLanguage(),
				},
			}
		},
		get isOriginalLanguage() {
			return siteFeatureConfig.isOriginalLanguage
		},
		get siteLanguages() {
			return siteFeatureConfig.siteLanguages
		},
		get currentLanguage() {
			return getCurrentLanguage()
		},
		setCurrentLanguage,
	}
}

export const Multilingual = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		named(FeatureExportsSymbol, name),
		MultilingualCurrentLanguageSymbol,
		LoggerSymbol,
	],
	multilingualFactory
)
