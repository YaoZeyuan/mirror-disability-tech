import {
	RendererPropsExtenderSym,
	WixCodeSdkHandlersProviderSym,
	PlatformPropsSyncManagerSymbol,
} from '@wix/thunderbolt-symbols'
import type {
	ComponentLibraries,
	ComponentsLoaderRegistry,
	ComponentLoaderFunction,
	ThunderboltHostAPI,
	CompControllersRegistry,
	ComponentsRegistry,
	UpdateCompProps,
	IComponentsRegistrar,
	IWrapComponent,
	GetCompBoundedUpdateProps,
	GetCompBoundedUpdateStyles,
	ComponentModule,
	CompControllerUtils,
	CompControllerHook,
} from './types'
import {
	ComponentDidMountWrapperSymbol,
	ComponentsLoaderSymbol,
	ComponentsRegistrarSymbol,
	ComponentWrapperSymbol,
	ExecuteComponentWrappersSymbol,
} from './symbols'
import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { ComponentsLoaderInit } from './componentsLoaderInit'
import { ComponentsLoader } from './componentsLoader'
import type { IComponentsLoader } from './IComponentLoader'
import platformPropsSyncManager from './platformPropsSyncManager'
import { compControllerUtilsFactory } from './compControllerUtilsFactory'
import { WithHydrateWrapperSSR } from './suspenseManagerSSR'
import { isLazyLoadCompatible } from './helpers'
import { WithHydrateWrapperCSR } from './suspenseManagerClient'
import { ComponentDidMountWrapper } from './ComponentDidMountWrapper'
import { ExecuteComponentWrappers } from './executeWrappers'

export const bindCommonSymbols: ContainerModuleLoader = (bind) => {
	bind(RendererPropsExtenderSym).to(ComponentsLoaderInit)
	bind(ComponentsLoaderSymbol).to(ComponentsLoader)
	bind(WixCodeSdkHandlersProviderSym, PlatformPropsSyncManagerSymbol).to(platformPropsSyncManager)
	bind(RendererPropsExtenderSym).to(compControllerUtilsFactory)
	bind(ExecuteComponentWrappersSymbol).to(ExecuteComponentWrappers)
}

// Public loader
export const site: ContainerModuleLoader = (bind) => {
	bindCommonSymbols(bind)
	bind(ComponentWrapperSymbol, ComponentDidMountWrapperSymbol).to(ComponentDidMountWrapper)
}

export const editor = bindCommonSymbols

// Public Symbols
export {
	ComponentsLoaderSymbol,
	ComponentsRegistrarSymbol,
	ComponentWrapperSymbol,
	ExecuteComponentWrappersSymbol,
	ComponentDidMountWrapperSymbol,
}

// Public Types
export type {
	IWrapComponent,
	IComponentsLoader,
	ComponentLibraries,
	IComponentsRegistrar,
	ComponentsLoaderRegistry,
	ComponentLoaderFunction,
	ThunderboltHostAPI,
	CompControllersRegistry,
	ComponentsRegistry,
	UpdateCompProps,
	GetCompBoundedUpdateProps,
	GetCompBoundedUpdateStyles,
	ComponentModule,
	CompControllerUtils,
	CompControllerHook,
}

// Public Utils
export { WithHydrateWrapperSSR, isLazyLoadCompatible, WithHydrateWrapperCSR }
