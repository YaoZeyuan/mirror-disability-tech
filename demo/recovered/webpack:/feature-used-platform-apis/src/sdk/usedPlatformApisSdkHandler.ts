import { withDependencies } from '@wix/thunderbolt-ioc'
import type { SdkHandlersProvider } from '@wix/thunderbolt-symbols'
import type { IUsedPlatformApis } from '../types'
import { UsedPlatformApisSymbol } from '../symbols'

export const usedPlatformApisSdkHandlers = withDependencies(
	[UsedPlatformApisSymbol],
	(usedPlatformApis: IUsedPlatformApis): SdkHandlersProvider<IUsedPlatformApis> => {
		return {
			getSdkHandlers: () => ({
				addUsedPlatformApi: usedPlatformApis.addUsedPlatformApi,
				getUsedPlatformApis: usedPlatformApis.getUsedPlatformApis,
			}),
		}
	}
)
