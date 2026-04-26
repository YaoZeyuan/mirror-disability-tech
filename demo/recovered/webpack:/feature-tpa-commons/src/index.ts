import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import {
	LifeCycle,
	TpaHandlerProviderSymbol,
	TpaSrcQueryParamProviderSymbol,
	WixCodeSdkHandlersProviderSym,
} from '@wix/thunderbolt-symbols'
import { TpaDataCapsuleSymbol } from './symbols'
import {
	BITpaSrcQueryParamProvider,
	ConsentPolicyTpaSrcQueryParamProvider,
	ExternalIdTpaSrcQueryParamProvider,
} from './tpaSrcQueryParamProviders'
import { TpaDataCapsule } from './tpaDataCapsule'
import { bindSharedFeatureParts } from './featureLoader'
import { PublicApiTPAHandler } from './publicApiTPAHandler'

export const site: ContainerModuleLoader = (bind) => {
	bindSharedFeatureParts(bind)
	bind(TpaSrcQueryParamProviderSymbol).to(ConsentPolicyTpaSrcQueryParamProvider)
	bind(TpaSrcQueryParamProviderSymbol).to(ExternalIdTpaSrcQueryParamProvider)
	bind(TpaSrcQueryParamProviderSymbol).to(BITpaSrcQueryParamProvider)
	if (process.env.browser) {
		bind(TpaDataCapsuleSymbol).to(TpaDataCapsule)
	}
}

export const page: ContainerModuleLoader = (bind) => {
	bind(TpaHandlerProviderSymbol, WixCodeSdkHandlersProviderSym, LifeCycle.PageWillUnmountHandler).to(
		PublicApiTPAHandler
	)
}

export {
	TpaHandlersManagerSymbol,
	TpaSectionSymbol,
	name,
	TpaDataCapsuleSymbol,
	TpaContextMappingSymbol,
	MasterPageTpaPropsCacheSymbol,
	TpaSrcBuilderSymbol,
	PinnedExternalIdStoreSymbol,
	TpaSrcUtilitySymbol,
} from './symbols'
export * from './types'
