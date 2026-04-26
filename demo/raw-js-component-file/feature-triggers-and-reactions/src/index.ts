import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { TriggersAndReactions } from './triggersAndReactions'
import { LifeCycle, WixCodeSdkHandlersProviderSym } from '@wix/thunderbolt-symbols'
import {
	ReactionCreatorFactorySymbol,
	ReactionsStateApiSymbol,
	triggersBreakpointValidatorSymbol,
	ViewportIntersectionHandlerSymbol,
	MotionEffectsReactionsSymbol,
	scrubReactionsManagerSymbol,
	ClassNameApiSymbol,
	ShouldEnableTriggersAndReactionsSymbol,
	ChildListObserverSymbol,
} from './symbols'
import { ReactionCreatorFactory } from './reactionCreatorFactory'
import { ReactionsStateApi } from './reactionsStateApi'
import { effectsTriggersSdkProvider } from './sdk/effectsTriggersSdkProvider'
import { ViewportIntersectionHandler } from './viewportIntersectionHandler'
import { triggersBreakpointValidator } from './triggersBreakpointValidator'
import { motionEffectsReactions } from './motionEffectsReactions'
import { ClassNameApi } from './classNameApi'
import { scrubReactionsManager } from './scrubReactionsManager'
import { ShouldEnableTriggersAndReactions } from './shouldEnableTriggersAndReactions'
import { childListObserverFactory } from './childListObserver'

export type { EffectTriggersSdkHandlers, IClassNameApi } from './types'

export const page: ContainerModuleLoader = (bind) => {
	bind(ReactionCreatorFactorySymbol, LifeCycle.PageWillUnmountHandler).to(ReactionCreatorFactory)
	bind(ViewportIntersectionHandlerSymbol).to(ViewportIntersectionHandler)
	bind(LifeCycle.PageWillMountHandler, ReactionsStateApiSymbol).to(ReactionsStateApi)
	bind(ClassNameApiSymbol).to(ClassNameApi)
	bind(
		LifeCycle.PageWillMountHandler,
		LifeCycle.PageDidMountHandler,
		LifeCycle.PageDidUnmountHandler,
		LifeCycle.PageDidLoadHandler,
		LifeCycle.PageWillUnmountHandler
	).to(TriggersAndReactions)
	bind(WixCodeSdkHandlersProviderSym).to(effectsTriggersSdkProvider)
	bind(triggersBreakpointValidatorSymbol).to(triggersBreakpointValidator)
	bind(MotionEffectsReactionsSymbol).to(motionEffectsReactions)
	bind(scrubReactionsManagerSymbol).to(scrubReactionsManager)
	bind(ShouldEnableTriggersAndReactionsSymbol).to(ShouldEnableTriggersAndReactions)
	bind(ChildListObserverSymbol).to(childListObserverFactory)
}

export { ClassNameApiSymbol } from './symbols'
