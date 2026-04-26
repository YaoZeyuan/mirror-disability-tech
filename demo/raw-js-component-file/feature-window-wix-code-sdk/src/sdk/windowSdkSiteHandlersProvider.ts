import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IWarmupDataProvider } from 'feature-warmup-data'
import { WarmupDataProviderSymbol } from 'feature-warmup-data'
import type { SdkHandlersProvider } from '@wix/thunderbolt-symbols'
import type { IWindowWixCodeSdkWarmupDataEnricher, AppsWarmupData } from '../types'
import { WindowWixCodeSdkWarmupDataEnricherSymbol } from '../symbols'

export const windowWixCodeSdkSiteHandlers = withDependencies(
	[WarmupDataProviderSymbol, WindowWixCodeSdkWarmupDataEnricherSymbol],
	(
		warmupDataProvider: IWarmupDataProvider,
		windowWixCodeSdkWarmupDataEnricher: IWindowWixCodeSdkWarmupDataEnricher
	): SdkHandlersProvider<{
		setAppWarmupData: IWindowWixCodeSdkWarmupDataEnricher['setAppWarmupData']
		onAppsWarmupDataReady: (callback: (warmupData: AppsWarmupData) => void) => void
	}> => {
		return {
			getSdkHandlers: () => ({
				onAppsWarmupDataReady(callback) {
					warmupDataProvider
						.getWarmupData<AppsWarmupData>('appsWarmupData')
						.then((warmupData) => callback(warmupData as AppsWarmupData))
						.catch((e) => {
							throw new Error(`Failed to get warmup data: ${e}`)
						})
				},
				setAppWarmupData: windowWixCodeSdkWarmupDataEnricher.setAppWarmupData,
			}),
		}
	}
)
