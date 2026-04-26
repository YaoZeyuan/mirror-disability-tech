import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { Motion } from './motion'
import { LifeCycle, WixCodeSdkHandlersProviderSym } from '@wix/thunderbolt-symbols'
import { MotionSymbol } from './symbols'
import { wixCodeHandlersProvider } from './wixCode/wixCodeHandlersProvider'

export type {
	IMotion,
	TimeEffectData,
	EffectDataExtras,
	ScrubEffectData,
	ScrubManager,
	WixCodeMotionHandlers,
} from './types'
export { MotionSymbol, name } from './symbols'
export { AnimationManager } from './AnimationManager'
export { animationApiFactory } from './animationApi'

export const page: ContainerModuleLoader = (bind) => {
	bind(WixCodeSdkHandlersProviderSym).to(wixCodeHandlersProvider)
	bind(LifeCycle.PageWillUnmountHandler, MotionSymbol).to(Motion)
}
