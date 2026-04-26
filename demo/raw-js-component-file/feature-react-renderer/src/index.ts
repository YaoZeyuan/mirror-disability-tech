import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { AppDidMountPromiseSymbol, BatchingStrategySymbol, LifeCycle, RendererSymbol } from '@wix/thunderbolt-symbols'
import type {
	RendererProps,
	AppProps,
	ClientRenderResponse,
	IRendererPropsProvider,
	IAppDidMountService,
} from './types'
import {
	PageTransitionsHandlerSymbol,
	RendererPropsProviderSym,
	ThunderboltRootComponentRendererSym,
	AppDidMountServiceSymbol,
} from './symbols'
import { bindCommonSymbols } from './bindCommonSymbols'
import { PageTransitionsHandler } from './pageTransitionsHandler'
import { ReactClientRenderer, AppRootRenderer } from './clientRenderer/reactClientRenderer'
import { ClientBatchingStrategy } from './components/clientBatchingStrategy'
import { ReactTestingRenderer } from './clientRenderer/reactTestingRenderer'
import { RunControllersWrapper } from './components/RunControllersWrapper'
import { ComponentWrapperSymbol } from '@wix/thunderbolt-components-loader'
import { ServicesManagerProviderWrapper } from './components/ServicesManagerProviderWrapper'
import { AppDidMountService, AppDidMountPromise } from './appDidMountService'

export const site: ContainerModuleLoader = (bind) => {
	bindCommonSymbols(bind)

	bind(AppDidMountServiceSymbol).to(AppDidMountService)
	bind(AppDidMountPromiseSymbol).to(AppDidMountPromise)

	bind(BatchingStrategySymbol, LifeCycle.AppDidMountHandler).to(ClientBatchingStrategy)
	if (process.env.NODE_ENV === 'test') {
		bind(RendererSymbol).to(ReactTestingRenderer)
	} else {
		bind(RendererSymbol).to(ReactClientRenderer)
	}
	bind(ThunderboltRootComponentRendererSym).to(AppRootRenderer)
	bind(PageTransitionsHandlerSymbol, LifeCycle.AppWillLoadPageHandler).to(PageTransitionsHandler)
	bind(ComponentWrapperSymbol).to(ServicesManagerProviderWrapper)
	bind(ComponentWrapperSymbol).to(RunControllersWrapper)
}

export {
	RendererProps,
	AppProps,
	ClientRenderResponse,
	IAppDidMountService,
	RendererPropsProviderSym,
	AppDidMountServiceSymbol,
	IRendererPropsProvider,
	RunControllersWrapper,
}

export { domStoreTemplate, DOM_STORE_DEFS_ID } from './domStoreTemplate'
