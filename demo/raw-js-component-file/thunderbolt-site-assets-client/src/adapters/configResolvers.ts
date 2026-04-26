import type { FleetConfig } from '@wix/thunderbolt-ssr-api'
import type { Experiments } from '@wix/thunderbolt-symbols'
import type { SiteAssetsClientConfig } from '@wix/site-assets-client'

export const shouldRouteStagingRequest = (fleetConfig: FleetConfig) => {
	return ['Stage', 'DeployPreview', 'Canary'].includes(fleetConfig.type) || process.env.NODE_ENV === 'development'
}

export const updateConfig = (experiments: Experiments, config: SiteAssetsClientConfig): SiteAssetsClientConfig => {
	// should be used for experimental config/topology overrides
	return config
}
