import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { Multilingual } from './multilingual'
import { MultilingualLinkUtilsAPISymbol, MultilingualSymbol } from './symbols'
import {
	LifeCycle,
	MultilingualCurrentLanguageSymbol,
	PlatformEnvDataProviderSymbol,
	TpaSrcQueryParamProviderSymbol,
} from '@wix/thunderbolt-symbols'
import { MultilingualLinkUtilsAPI } from './multilingualLinkUtilsAPI'
import { MultilingualTpaSrcQueryParamProvider } from './tpaSrcQueryParamProvider'
import { CurrentLanguage } from './currentLanguage'

export const site: ContainerModuleLoader = (bind) => {
	bind(MultilingualSymbol, PlatformEnvDataProviderSymbol, LifeCycle.AppDidMountHandler).to(Multilingual)
	bind(MultilingualLinkUtilsAPISymbol).to(MultilingualLinkUtilsAPI)
	bind(TpaSrcQueryParamProviderSymbol).to(MultilingualTpaSrcQueryParamProvider)
	bind(MultilingualCurrentLanguageSymbol).to(CurrentLanguage)
}

export { Multilingual }
export * from './symbols'
export * from './types'
