import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { TpaFullScreenModeAPISymbol } from './symbols'
import { TpaFullScreenModeAPI } from './tpaFullScreenMode'

export * from './symbols'
export * from './types'
export { TpaFullScreenModeAPI }
export const page: ContainerModuleLoader = (bind) => {
	bind(TpaFullScreenModeAPISymbol).to(TpaFullScreenModeAPI)
}

export const editorPage = page
