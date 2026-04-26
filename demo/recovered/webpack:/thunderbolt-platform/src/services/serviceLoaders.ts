import type { IPlatformLogger, PlatformConfig, ServicesLoaders } from '@wix/thunderbolt-symbols'
import { NamedSignalsDefinition } from '@wix/viewer-service-named-signals/definition'
import { SdkStateDefinition } from '@wix/viewer-service-sdk-state/definition'
import namedSignalsServiceConfig from './configs/namedSignalsServiceConfig'
import linkUtilsServiceConfig from './configs/linkUtilsServiceConfig'
import routerServiceConfig from './configs/routerServiceConfig'
import siteMembersServiceConfig from './configs/siteMembersServiceConfig'
import { StyleUtilsDefinition } from '@wix/viewer-service-style-utils/definition'
import { FedopsLoggerDefinition } from '@wix/viewer-service-fedops-logger/definition'
import { UrlDefinition } from '@wix/viewer-service-url/definition'
import { EnvironmentDefinition } from '@wix/viewer-service-environment/definition'
import type { ServiceConfigFactory } from '../types'
import { LinkUtilsDefinition } from '@wix/viewer-service-link-utils/definition'
import { WixClientDefinition } from '@wix/viewer-service-wix-client/definition'
import { ConsentPolicyDefinition } from '@wix/viewer-service-consent-policy/definition'
import { BusinessLoggerDefinition } from '@wix/viewer-service-business-logger/definition'
import { TranslationsDefinition } from '@wix/viewer-service-translations/definition'
import { InteractionsDefinition } from '@wix/viewer-service-interactions/definition'
import { SiteThemeDefinition } from '@wix/viewer-service-site-theme/definition'
import { PageContextDefinition } from '@wix/viewer-service-page-context/definition'
import { PagesDefinition } from '@wix/viewer-service-pages/definition'
import { TopologyDefinition } from '@wix/viewer-service-topology/definition'
import { noopServiceImplementations } from './noopImplementations'
import { RouterDefinition } from '@wix/viewer-service-router/definition'
import { DynamicRouteDefinition } from '@wix/viewer-service-dynamic-route/definition'
import dynamicRouteServiceConfig from './configs/dynamicRouteServiceConfig'
import { SiteMembersDefinition } from '@wix/viewer-service-site-members/definition'

export const serviceLoaders: ServicesLoaders = {
	[NamedSignalsDefinition as string]: () =>
		import('feature-named-signals-service/service' /* webpackChunkName: "platformNamedSignalsService" */),
	[StyleUtilsDefinition as string]: () =>
		import('feature-style-utils-service/service' /* webpackChunkName: "platformStyleUtilsService" */),
	[FedopsLoggerDefinition as string]: () =>
		import('feature-fedops-logger-service/service' /* webpackChunkName: "platformFedopsLoggerService" */),
	[EnvironmentDefinition as string]: () =>
		import('feature-environment-service/service' /* webpackChunkName: "platformEnvironmentService" */),
	[TranslationsDefinition as string]: () =>
		import('feature-translations-service/service' /* webpackChunkName: "platformTranslationsService" */),
	[InteractionsDefinition as string]: () =>
		import('feature-interactions-service/service' /* webpackChunkName: "platformInteractionsService" */),
	[SiteThemeDefinition as string]: () =>
		import('feature-site-theme-service/service' /* webpackChunkName: "platformSiteThemeService" */),
	[PageContextDefinition as string]: () =>
		import('feature-page-context-service/service' /* webpackChunkName: "platformPageContextService" */),
	[PagesDefinition as string]: () =>
		import('feature-pages-service/service' /* webpackChunkName: "platformPagesService" */),
	[TopologyDefinition as string]: () =>
		import('feature-topology-service/service' /* webpackChunkName: "platformTopologyService" */),
	[ConsentPolicyDefinition as string]: () =>
		import('feature-consent-policy-service/service' /* webpackChunkName: "platformConsentPolicyService" */),
	[LinkUtilsDefinition as string]: () =>
		import('feature-link-utils-service/service' /* webpackChunkName: "platformLinkUtilsService" */),
	[SdkStateDefinition as string]: () =>
		import('feature-sdk-state-service/service' /* webpackChunkName: "platformSdkStateService" */),
	[RouterDefinition as string]: () =>
		import('feature-router-service/service' /* webpackChunkName: "platformRouterService" */),
	[DynamicRouteDefinition as string]: () =>
		import('feature-dynamic-route-service/service' /* webpackChunkName: "platformDynamicRouteService" */),
	[SiteMembersDefinition as string]: () =>
		import('feature-site-members-service/service' /* webpackChunkName: "platformSiteMembersService" */),
}

export const serviceConfigs: {
	[serviceDefinition: string]: ServiceConfigFactory
} = {
	[NamedSignalsDefinition as string]: ({ modelsApi, bootstrapData, viewerHandlers }) =>
		namedSignalsServiceConfig(modelsApi, bootstrapData, viewerHandlers),
	[LinkUtilsDefinition]: linkUtilsServiceConfig,
	[RouterDefinition]: routerServiceConfig,
	[DynamicRouteDefinition]: dynamicRouteServiceConfig,
	[SiteMembersDefinition]: siteMembersServiceConfig,
}

// TODO - remove when implemented and stable in TB
export const noopServiceDefinitions = [
	WixClientDefinition as string,
	BusinessLoggerDefinition as string,
	UrlDefinition as string,
]

export const getServiceDefinitionToFactoryPromise = async (
	serviceDefinitionToConfig: PlatformConfig | undefined,
	logger: IPlatformLogger
) =>
	Promise.all(
		Array.from(new Set([...Object.keys(serviceDefinitionToConfig!), ...noopServiceDefinitions])).map(
			(serviceDefinition) => {
				// TODO - remove when implemented and stable in TB
				if (noopServiceDefinitions.includes(serviceDefinition)) {
					return Promise.resolve([
						serviceDefinition,
						{
							definition: serviceDefinition,
							impl: () => noopServiceImplementations[serviceDefinition],
						},
					])
				}
				const factoryGetter = serviceLoaders[serviceDefinition]
				if (!factoryGetter) {
					logger.captureError(new Error(`Service ${serviceDefinition} is not supported`), {
						tags: {
							feature: 'platform',
						},
					})
					return Promise.resolve([serviceDefinition, { impl: () => ({}) }])
				}
				return factoryGetter().then((implementation) => [serviceDefinition, implementation])
			}
		)
	).then((servicesArray) => Object.fromEntries(servicesArray))
