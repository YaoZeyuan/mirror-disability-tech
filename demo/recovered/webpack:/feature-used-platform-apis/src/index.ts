import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { UsedPlatformApis } from './usedPlatformApis'
import { UsedPlatformApisSymbol } from './symbols'
import { WixCodeSdkHandlersProviderSym } from '@wix/thunderbolt-symbols'
import { usedPlatformApisSdkHandlers } from './sdk/usedPlatformApisSdkHandler'

export * from './types'
export * from './symbols'

export const site: ContainerModuleLoader = (bind) => {
	bind(UsedPlatformApisSymbol).to(UsedPlatformApis)
	bind(WixCodeSdkHandlersProviderSym).to(usedPlatformApisSdkHandlers)
}
