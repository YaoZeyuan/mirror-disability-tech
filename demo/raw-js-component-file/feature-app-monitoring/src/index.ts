import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { AppMonitoring } from './appMonitoring'
import { AppMonitoringSymbol } from './symbols'

export const site: ContainerModuleLoader = (bind) => {
	bind(AppMonitoringSymbol).to(AppMonitoring)
}

export { AppMonitoringSymbol }
export * from './types'
