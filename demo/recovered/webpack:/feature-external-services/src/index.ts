import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { ExternalServicesLoader } from './externalServicesLoader'
import { ServiceBundleLoader } from './bundleLoader'
import { ExternalServicesLoaderSymbol, ServiceBundleLoaderSymbol } from './symbols'

export const site: ContainerModuleLoader = (bind) => {
	bind(ServiceBundleLoaderSymbol).to(ServiceBundleLoader)
}

export const page: ContainerModuleLoader = (bind) => {
	bind(ExternalServicesLoaderSymbol).to(ExternalServicesLoader)
}

export { ExternalServicesLoaderSymbol } from './symbols'
export type { IExternalServicesLoader } from './types'
