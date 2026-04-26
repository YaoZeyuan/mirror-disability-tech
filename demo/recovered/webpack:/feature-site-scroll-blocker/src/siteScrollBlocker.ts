import { createSiteScrollBlocker } from './createSiteScrollBlocker'
import { named, withDependencies, optional } from '@wix/thunderbolt-ioc'
import type { Experiments } from '@wix/thunderbolt-symbols'
import {
	ExperimentsSymbol,
	FeatureExportsSymbol,
	SiteFeatureConfigSymbol,
	SiteServicesManagerSymbol,
} from '@wix/thunderbolt-symbols'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import { name } from './index'
import type { ISiteScrollBlocker } from '@wix/viewer-service-site-scroll-blocker/types'
import { getSiteScrollBlockerConfig } from './siteScrollBlockerConfig'
import type { ServicesManager } from '@wix/services-manager/cjs/build/types'
import { SiteScrollBlockerDefinition } from '@wix/viewer-service-site-scroll-blocker/definition'
import type { SiteScrollBlockerSiteConfig } from './types'

const siteScrollBlockerFactory = (
	siteScrollBlockerExports: IFeatureExportsStore<typeof name>,
	siteConfig: SiteScrollBlockerSiteConfig,
	experiments: Experiments,
	servicesManager?: ServicesManager
): ISiteScrollBlocker => {
	const config = getSiteScrollBlockerConfig(siteScrollBlockerExports)
	const isServicesInfra = experiments['specs.thunderbolt.servicesInfra'] || siteConfig.isBuilderComponentModel
	const scrollBlocker =
		isServicesInfra && servicesManager?.hasService(SiteScrollBlockerDefinition)
			? servicesManager?.getService(SiteScrollBlockerDefinition)
			: createSiteScrollBlocker({ ...config, experiments })

	siteScrollBlockerExports.export({
		setSiteScrollingBlocked: scrollBlocker.setSiteScrollingBlocked,
		isScrollingBlocked: scrollBlocker.isScrollingBlocked(),
	})

	return scrollBlocker
}

export const SiteScrollBlocker = withDependencies(
	[
		named(FeatureExportsSymbol, name),
		named(SiteFeatureConfigSymbol, name),
		ExperimentsSymbol,
		optional(SiteServicesManagerSymbol),
	],
	siteScrollBlockerFactory
)
