import _ from 'lodash'
import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { named, optional, withDependencies, createIdentifier } from '@wix/thunderbolt-ioc'
import { BusinessLoggerFactory } from './businessLogger'
import { BsiManagerSymbol, name } from './symbols'
import type { Experiments } from '@wix/thunderbolt-symbols'
import {
	WixCodeSdkHandlersProviderSym,
	BusinessLoggerSymbol,
	FeatureExportsSymbol,
	ExperimentsSymbol,
	SiteServicesManagerSymbol,
	SiteFeatureConfigSymbol,
} from '@wix/thunderbolt-symbols'
import { bsiSdkHandlersProvider } from './bsiSdkHandlersProvider'
import { BsiManager } from './bsiManager'
import type { BusinessLogger, BusinessLoggerSiteConfig } from './types'
import { UrlChangeHandlerForPage } from 'feature-router'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import type { ServicesManager } from '@wix/services-manager/types'
import { BusinessLoggerDefinition } from '@wix/viewer-service-business-logger/definition'

const TypedServicesManagerSymbol = createIdentifier<ServicesManager>(SiteServicesManagerSymbol)

export const site: ContainerModuleLoader = (bind) => {
	bind(BusinessLoggerSymbol).to(BusinessLoggerFactory)
	bind(BsiManagerSymbol, UrlChangeHandlerForPage).to(BsiManager) // TODO bind to page container
	bind(WixCodeSdkHandlersProviderSym).to(bsiSdkHandlersProvider)
}

export const editor: ContainerModuleLoader = (bind) => {
	bind(BusinessLoggerSymbol).to(
		withDependencies(
			[
				named(FeatureExportsSymbol, name),
				ExperimentsSymbol,
				named(SiteFeatureConfigSymbol, name),
				optional(TypedServicesManagerSymbol),
			] as const,
			(
				businessLoggerExports: IFeatureExportsStore<typeof name>,
				experiments: Experiments,
				siteConfig: BusinessLoggerSiteConfig,
				servicesManager?: ServicesManager
			): BusinessLogger => {
				const isBuilder = siteConfig.isBuilderComponentModel
				const isServicesInfra = experiments['specs.thunderbolt.servicesInfra'] || isBuilder
				if (isServicesInfra) {
					if (servicesManager && servicesManager.hasService(BusinessLoggerDefinition)) {
						const businessLoggerService = servicesManager.getService(BusinessLoggerDefinition)
						if (businessLoggerService) {
							businessLoggerExports.export({
								reportBi: businessLoggerService.reportBi,
							})
							return {
								reportBi: businessLoggerService.reportBi,
								logger: businessLoggerService.logger,
							}
						}
					}
				}

				const noop = () => {
					return Promise.resolve()
				}

				const businessLogger: BusinessLogger = {
					reportBi: noop,
					logger: {
						log: noop,
						flush: noop,
						updateDefaults: () => businessLogger.logger,
						report: noop,
					},
				}

				businessLoggerExports.export(businessLogger)

				return businessLogger
			}
		)
	)
	bind(WixCodeSdkHandlersProviderSym).to(
		withDependencies([], () => {
			return {
				getSdkHandlers: () => ({
					reportActivity: _.noop,
				}),
			}
		})
	)
}

export type { BusinessLogger, IBsiManager } from './types'
export { BsiManagerSymbol, name }
