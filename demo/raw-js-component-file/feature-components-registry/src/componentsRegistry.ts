import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, PlatformEnvDataProvider } from '@wix/thunderbolt-symbols'
import { SiteFeatureConfigSymbol, BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import type { IComponentsRegistrySiteConfig } from './symbols'
import { name } from './symbols'

const componentsRegistryPlatformFactory = (
	componentsRegistrySiteConfig: IComponentsRegistrySiteConfig,
	window: BrowserWindow
): PlatformEnvDataProvider => {
	return {
		platformEnvData() {
			return {
				componentsRegistry: {
					librariesTopology: componentsRegistrySiteConfig.librariesTopology,
					mode: window ? 'lazy' : 'eager',
				},
			}
		},
	}
}

export const СomponentsRegistryPlatformEnvDataProvider = withDependencies(
	[named(SiteFeatureConfigSymbol, name), BrowserWindowSymbol],
	componentsRegistryPlatformFactory
)
