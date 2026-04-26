import { withDependencies, named } from '@wix/thunderbolt-ioc'
import {
	PageFeatureConfigSymbol,
	BrowserWindowSymbol,
	DomSelectorsSymbol,
	ReducedMotionSymbol,
	Props,
	FeatureStateSymbol,
	pageIdSym,
} from '@wix/thunderbolt-symbols'
import type { IMotion, MotionFactory } from './types'
import { name } from './symbols'
import { isSSR } from '@wix/thunderbolt-commons'
import { AnimationManager } from './AnimationManager'
import { animationApiFactory } from './animationApi'
import viewport from './viewport'

const motionFactory: MotionFactory = (
	featureConfig,
	featureState,
	pageId,
	propsStore,
	browserWindow,
	reducedMotion,
	domSelectors
): IMotion => {
	const {
		animationDataByCompId,
		scrubAnimationBreakpoints,
		repeaterTemplateToParentMap,
		isResponsive,
		useCSSTimeAnimations: useCSSTime = false,
	} = featureConfig

	if (isSSR(browserWindow)) {
		return {
			name: 'motion',
			async pageWillUnmount() {},
			getManager() {
				return undefined
			},
		}
	}

	const animationApi = animationApiFactory(domSelectors, repeaterTemplateToParentMap, propsStore, useCSSTime)
	let animationManager = featureState.get()?.[pageId]

	if (!animationManager) {
		animationManager = new AnimationManager(
			animationApi,
			viewport,
			{ isResponsive, reducedMotion, useCSSTime },
			domSelectors,
			browserWindow
		)
		featureState.update((state) => ({ ...state, [pageId]: animationManager }))
	}

	const animationData = reducedMotion ? {} : Object.assign({}, ...Object.values(animationDataByCompId || {}))
	animationManager.init(animationData, scrubAnimationBreakpoints)

	return {
		name: 'motion',
		async pageWillUnmount() {
			animationManager?.clear()
		},
		getManager() {
			return animationManager
		},
	}
}

export const Motion = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		named(FeatureStateSymbol, name),
		pageIdSym,
		Props,
		BrowserWindowSymbol,
		ReducedMotionSymbol,
		DomSelectorsSymbol,
	],
	motionFactory
)
