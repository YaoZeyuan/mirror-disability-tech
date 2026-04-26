import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { ServiceProvider, ILogger } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol, LoggerSymbol } from '@wix/thunderbolt-symbols'
import { ServiceBundleLoaderSymbol, name } from './symbols'
import type { ExternalServicesPageConfig, IExternalServicesLoader } from './types'
import type { IServiceBundleLoader } from './bundleLoader'

export const ExternalServicesLoader = withDependencies(
	[named(PageFeatureConfigSymbol, name), LoggerSymbol, ServiceBundleLoaderSymbol],
	(
		pageConfig: ExternalServicesPageConfig,
		logger: ILogger,
		bundleLoaderService: IServiceBundleLoader
	): IExternalServicesLoader => {
		let loadedServiceProviders: Array<ServiceProvider> | null = null
		let loadingPromise: Promise<Array<ServiceProvider>> | null = null

		return {
			loadExternalServices: async (): Promise<Array<ServiceProvider>> => {
				if (loadedServiceProviders !== null) {
					return loadedServiceProviders
				}

				if (loadingPromise !== null) {
					return loadingPromise
				}

				loadingPromise = (async () => {
					const { requiredExternalServices } = pageConfig

					if (!requiredExternalServices || requiredExternalServices.length === 0) {
						loadedServiceProviders = []
						return []
					}

					logger.interactionStarted('load_external_services', {
						paramsOverrides: {
							services: requiredExternalServices.map((service) => service.packageName).join(';'),
						},
					})

					const bundlePromises = requiredExternalServices.map(async (serviceData) => {
						const { packageName, viewerBundleUrl, appDefinitionId } = serviceData

						if (!viewerBundleUrl) {
							logger.captureError(new Error(`External service missing bundle URL: ${packageName}`), {
								tags: {
									feature: 'externalServices',
									packageName,
								},
							})
							return null
						}

						const bundle = await bundleLoaderService.loadServiceBundleWithCache(
							viewerBundleUrl,
							packageName,
							appDefinitionId
						)

						if (!bundle) {
							logger.captureError(new Error(`Failed to load external service bundle: ${packageName}`), {
								tags: {
									feature: 'externalServices',
									packageName,
								},
							})
							return null
						}

						const serviceProvider: ServiceProvider = {
							definition: bundle.definition,
							impl: bundle.impl,
							config: {}, // External services don't have a config
						}

						logger.interactionEnded('external_service_loaded', {
							paramsOverrides: { packageName },
						})

						return serviceProvider
					})

					const results = await Promise.all(bundlePromises)

					const successfulProviders = results.filter((provider): provider is ServiceProvider => provider !== null)
					loadedServiceProviders = successfulProviders

					logger.interactionEnded('load_external_services', {
						paramsOverrides: {
							loaded: String(successfulProviders.length),
							failed: String(requiredExternalServices.length - successfulProviders.length),
						},
					})

					return successfulProviders
				})()

				return loadingPromise
			},
		}
	}
)
