import { PageFeatureConfigSymbol, Props, DomSelectorsSymbol } from '@wix/thunderbolt-symbols'
import type { IDomSelectors } from '@wix/thunderbolt-symbols'
import { TweenEngine, AnimationsKit } from '@wix/animations-kit'
import gsap from 'gsap'
import ScrollToPlugin from 'gsap/ScrollToPlugin'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { name } from './symbols'
import { getAnimatorManager } from './animations'
import type { ICreateAnimatorManager } from './types'

export const CreateAnimatorManager = withDependencies(
	[named(PageFeatureConfigSymbol, name), Props, DomSelectorsSymbol],
	(featureConfig, propsStore, domSelectors: IDomSelectors): ICreateAnimatorManager =>
		(viewMode) => {
			const isMotion = viewMode === 'motion'
			const animationViewMode = isMotion ? undefined : viewMode
			const plugins = isMotion ? [] : [ScrollToPlugin]
			const { engine } = new TweenEngine(gsap, plugins)
			const animator = new AnimationsKit(engine, undefined, animationViewMode, isMotion)

			return getAnimatorManager(animator, domSelectors, featureConfig, propsStore)
		}
)
