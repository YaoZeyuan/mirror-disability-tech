import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { SpeculationRules } from './speculationRules'
import { LifeCycle } from '@wix/thunderbolt-symbols'
import { SpeculationRulesSymbol } from './symbols'
import { SpeculationRulesApi } from './speculationRulesApi'

export const site: ContainerModuleLoader = (bind) => {
	bind(LifeCycle.AppWillMountHandler).to(SpeculationRules)
	bind(SpeculationRulesSymbol).to(SpeculationRulesApi)
}

export { SpeculationRulesSymbol } from './symbols'
export type { ISpeculationRules, SpeculationRulesConfig } from './types'
