import type { Environment } from '@wix/thunderbolt-environment'
import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type { PlatformEnvDataProvider } from '@wix/thunderbolt-symbols'
import { MainGridAppIdFetchSymbol } from '@wix/thunderbolt-symbols'

export const mainGridAppIdProvider = withDependencies(
	[optional(MainGridAppIdFetchSymbol)],
	(mainGridAppId?: Environment['mainGridAppId']): PlatformEnvDataProvider => {
		return {
			async platformEnvData() {
				return {
					mainGridAppId: await mainGridAppId,
				}
			},
		}
	}
)
