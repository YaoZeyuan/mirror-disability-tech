import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ILogger, SdkHandlersProvider } from '@wix/thunderbolt-symbols'
import { LoggerSymbol } from '@wix/thunderbolt-symbols'
import type { FedopsnWixCodeSdkHandlers } from '../types'

export const FedopsSdkHandlersProvider = withDependencies(
	[LoggerSymbol],
	(logger: ILogger): SdkHandlersProvider<FedopsnWixCodeSdkHandlers> => {
		return {
			getSdkHandlers: () => ({
				fedopsWixCodeSdk: {
					registerWidgets: (widgetAppNames: Array<string>) => {
						logger.registerPlatformWidgets(widgetAppNames)
					},
				},
			}),
		}
	}
)
