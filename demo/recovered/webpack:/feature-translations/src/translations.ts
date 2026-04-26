import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { ILogger, IPageDidMountHandler } from '@wix/thunderbolt-symbols'
import { LoggerSymbol, MasterPageFeatureConfigSymbol, pageIdSym } from '@wix/thunderbolt-symbols'
import { name as translationFeatureName } from './symbols'
import type { TranslationMasterPageConfig } from './types'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'

export const CorruptedTranslationsBI = withDependencies(
	[named(MasterPageFeatureConfigSymbol, translationFeatureName), LoggerSymbol, pageIdSym, NavigationManagerSymbol],
	(
		masterPageConfig: TranslationMasterPageConfig,
		logger: ILogger,
		pageIdSymbol: string,
		navigationManager: INavigationManager
	): IPageDidMountHandler => {
		return {
			pageDidMount() {
				if (navigationManager.isFirstNavigation() && pageIdSymbol === 'masterPage') {
					const { isPageUriSEOTranslated, hasOriginalLanguageTranslation } = masterPageConfig
					logger.meter('translationCorruption', {
						customParams: { isPageUriSEOTranslated, hasOriginalLanguageTranslation },
					})
				}
			},
		}
	}
)
