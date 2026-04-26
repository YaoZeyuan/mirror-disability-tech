import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { LanguageSymbol } from '@wix/thunderbolt-symbols'
import type { ViewerModel, Experiments, ServiceProvider, ILanguage, ViewMode } from '@wix/thunderbolt-symbols'
import {
	ViewerModelSym,
	ExperimentsSymbol,
	SiteFeatureConfigSymbol,
	MasterPageFeatureConfigSymbol,
	ViewModeSym,
} from '@wix/thunderbolt-symbols'
import type { IEnvironmentDefinition } from '@wix/viewer-service-environment/definition'
import { EnvironmentDefinition as definition } from '@wix/viewer-service-environment/definition'
import { EnvironmentService as impl } from '@wix/viewer-service-environment/implementations'
import { name } from './symbols'
import type { EnvironmentServiceMasterPageConfig, EnvironmentServiceSiteConfig } from './types'
import { getServiceConfig } from './utils'

export const environmentService = withDependencies(
	[
		ViewerModelSym,
		ExperimentsSymbol,
		named(SiteFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		LanguageSymbol,
		ViewModeSym,
	],
	(
		viewerModel: ViewerModel,
		experiments: Experiments,
		siteFeatureConfig: EnvironmentServiceSiteConfig,
		masterPageFeatureConfig: EnvironmentServiceMasterPageConfig,
		languageApi: ILanguage,
		viewMode: ViewMode
	): ServiceProvider<IEnvironmentDefinition, typeof impl> => {
		const config = {
			...getServiceConfig(siteFeatureConfig, viewerModel, languageApi.siteLanguage, viewMode),
			languageDirection: masterPageFeatureConfig.languageDirection,
			experiments,
		}

		return {
			definition,
			impl,
			config,
			platformConfig: config,
		}
	}
)
