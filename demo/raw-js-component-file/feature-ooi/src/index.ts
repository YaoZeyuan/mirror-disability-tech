import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { LifeCycle, WixCodeSdkHandlersProviderSym } from '@wix/thunderbolt-symbols'
import { WarmupDataEnricherSymbol } from 'feature-warmup-data'
import { ooiPageWillMount } from './ooi'
import OOISdkHandlersProvider from './ooiSdkHandlersProvider'
import type { Reporter } from './reporting'
import ReporterFactory, { OOIReporterSymbol } from './reporting'
import OOIPostSsrPropsEnricher from './ssr/ooiPostSsrPropsEnricher'
import OOISsrManager from './ssr/ooiSsrManager'
import { ooiLoadComponentsPageWillMountSSR } from './ssr/ooiLoadComponentsPageWillMountSSR'
import {
	ModuleFederationSharedScopeSymbol,
	OOIPageComponentsLoaderSymbol,
	OOISsrManagerSymbol,
	ReactLoaderForOOISymbol,
} from './symbols'
import type { IViewportWidthProvider } from './viewportWidthProvider'
import viewportWidthProvider, { OOIViewportWidthProviderSymbol } from './viewportWidthProvider'
import { ooiCompData } from './ooiCompData'
import { OOICompDataSymbol } from 'feature-ooi-tpa-shared-config'
import { ComponentsRegistrarSymbol } from '@wix/thunderbolt-components-loader'
import { ooiComponentsRegistrar } from './ooiComponentsRegistrar'
import { ooiWaitLoadableReady } from './client/ooiWaitLoadableReady'

export const page: ContainerModuleLoader = (bind) => {
	bind(LifeCycle.PageWillMountHandler, LifeCycle.PageDidMountHandler).to(ooiPageWillMount)
	bind(WixCodeSdkHandlersProviderSym).to(OOISdkHandlersProvider)

	if (process.env.browser) {
		// put new client loading here
		bind(LifeCycle.PageWillMountHandler).to(ooiWaitLoadableReady)
		bind(LifeCycle.PageWillMountHandler).to(require('./client/ooiLoadStaticCSSPageWillMountClient').default)
	} else {
		// put new ssr loading here
		bind(LifeCycle.PageWillMountHandler, OOIPageComponentsLoaderSymbol).to(ooiLoadComponentsPageWillMountSSR)
		bind(LifeCycle.PageWillMountHandler).to(require('./ssr/ooiLoadStaticCSSPageWillMountSSR').default)
	}
}

export const site: ContainerModuleLoader = (bind) => {
	bind(OOICompDataSymbol).to(ooiCompData)
	bind<Reporter>(OOIReporterSymbol).to(ReporterFactory)
	bind(ModuleFederationSharedScopeSymbol).toConstantValue({})
	bind<IViewportWidthProvider>(OOIViewportWidthProviderSymbol).to(viewportWidthProvider)
	bind(ComponentsRegistrarSymbol).to(ooiComponentsRegistrar)

	if (process.env.browser || process.env.NODE_ENV === 'test') {
		bind(ReactLoaderForOOISymbol).to(require('./client/componentsLoaderClient').default)
		bind(LifeCycle.AppWillRenderFirstPageHandler, LifeCycle.AppDidMountHandler).to(OOIPostSsrPropsEnricher)
	} else {
		bind(ReactLoaderForOOISymbol).to(require('./ssr/componentsLoaderSSR').default)
		bind(OOISsrManagerSymbol, WarmupDataEnricherSymbol).to(OOISsrManager)
		bind(LifeCycle.AppWillLoadPageHandler).to(require('./ssr/ssrModuleFederatedPreloadTagsLoader').default)
	}
}

export * from './symbols'
export * from './types'
