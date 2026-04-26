import { withDependencies, named, optional } from '@wix/thunderbolt-ioc'
import type { IAppWillMountHandler, ViewerModel, Experiments } from '@wix/thunderbolt-symbols'
import {
	FeatureExportsSymbol,
	ReducedMotionSymbol,
	ViewerModelSym,
	ExperimentsSymbol,
	SiteFeatureConfigSymbol,
	SiteServicesManagerSymbol,
} from '@wix/thunderbolt-symbols'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import type { ServicesManager } from '@wix/services-manager/types'
import { EnvironmentDefinition } from '@wix/viewer-service-environment/definition'
import { name } from './symbols'
import type { EnvSiteConfig } from './types'

const exportsName = 'env'

export const EnvFactory = withDependencies(
	[
		named(FeatureExportsSymbol, name),
		ReducedMotionSymbol,
		ViewerModelSym,
		ExperimentsSymbol,
		named(SiteFeatureConfigSymbol, name),
		optional(SiteServicesManagerSymbol),
	],
	(
		envExports: IFeatureExportsStore<typeof exportsName>,
		reducedMotion: boolean,
		viewerModel: ViewerModel,
		experiments: Experiments,
		siteFeatureConfig: EnvSiteConfig,
		servicesManager?: ServicesManager
	): IAppWillMountHandler => {
		let editorType: string
		let domain: string
		let previewMode: boolean
		let userId: string
		let exportedExperiments: Experiments

		const isServicesInfra = experiments['specs.thunderbolt.servicesInfra'] || siteFeatureConfig.isBuilderComponentModel
		if (isServicesInfra && servicesManager?.hasService(EnvironmentDefinition)) {
			const envService = servicesManager?.getService(EnvironmentDefinition)
			if (envService) {
				;({ editorType, domain, userId, experiments: exportedExperiments } = envService)
				previewMode = envService.getPreviewMode()
			}
		} else {
			;({ editorType, domain, previewMode } = siteFeatureConfig)
			userId = viewerModel.site.userId
			exportedExperiments = experiments
		}

		return {
			appWillMount() {
				envExports.export({
					reducedMotion,
					editorType,
					userId,
					domain,
					previewMode,
					experiments: exportedExperiments,
				})
			},
		}
	}
)
