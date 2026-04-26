import { ComponentLibrariesSymbol } from '@wix/thunderbolt-symbols'
import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import type { Environment } from '../types/Environment'

export const site =
	({ componentLibraries }: Environment): ContainerModuleLoader =>
	(bind) => {
		bind(ComponentLibrariesSymbol).toConstantValue(componentLibraries)
	}
