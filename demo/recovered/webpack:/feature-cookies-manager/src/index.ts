import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { CookiesManager, CookiesManagerNoopified } from './cookiesManager'
import { CookiesManagerSymbol } from './symbols'

export const site: ContainerModuleLoader = (bind) => {
	if (process.env.browser) {
		bind(CookiesManagerSymbol).to(CookiesManager)
	} else {
		bind(CookiesManagerSymbol).to(CookiesManagerNoopified)
	}
}

export const editor: ContainerModuleLoader = (bind) => {
	bind(CookiesManagerSymbol).to(CookiesManagerNoopified)
}

export * from './symbols'
export * from './types'
