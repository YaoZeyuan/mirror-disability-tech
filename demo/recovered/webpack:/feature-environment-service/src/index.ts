import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { ServiceProviderSymbol } from '@wix/thunderbolt-symbols'
import { environmentService } from './environmentService'

export const site: ContainerModuleLoader = (bind) => {
	bind(ServiceProviderSymbol).to(environmentService)
}
