import { withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IComponentsStylesOverrides,
	ICompsLifeCycle,
	SdkHandlersProvider,
} from '@wix/thunderbolt-symbols'
import {
	AppDidMountPromiseSymbol,
	BrowserWindowSymbol,
	ComponentsStylesOverridesSymbol,
	CompsLifeCycleSym,
	ReducedMotionSymbol,
} from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import type { AnimationGroup } from '@wix/motion'
import type { IMotion, WixCodeMotionHandlers, TimeEffectData } from '../types'
import { MotionSymbol, name as featureName } from '../symbols'
import { getInnerMostItemId } from '@wix/thunderbolt-commons'

export const wixCodeHandlersProvider = withDependencies(
	[
		MotionSymbol,
		ComponentsStylesOverridesSymbol,
		BrowserWindowSymbol,
		AppDidMountPromiseSymbol,
		ReducedMotionSymbol,
		CompsLifeCycleSym,
		DomSelectorsSymbol,
	],
	(
		motion: IMotion,
		componentsStylesOverrides: IComponentsStylesOverrides,
		window: BrowserWindow,
		appDidMountPromise: Promise<unknown>,
		reducedMotion: boolean,
		compsLifeCycle: ICompsLifeCycle,
		domSelectors: IDomSelectors
	): SdkHandlersProvider<WixCodeMotionHandlers> => ({
		getSdkHandlers: () => ({
			[featureName]: {
				runAnimation: async (animationData: TimeEffectData, animationDirection: 'in' | 'out'): Promise<void> => {
					const targets: Array<string> = Array.isArray(animationData.targetId)
						? animationData.targetId
						: [animationData.targetId]

					return new Promise<void>(async (resolve) => {
						const animationManager = motion.getManager()
						const animations: Array<AnimationGroup> = []

						if (!animationManager) {
							resolve()
							return
						}

						const onStart = () => {
							addIsAnimatingClass(window, targets, domSelectors)

							if (animationDirection === 'in') {
								componentsStylesOverrides.update(
									targets.reduce((styles, compId) => ({ ...styles, [compId]: { visibility: null } }), {})
								)
							}
						}

						const onEnd = () => {
							if (animationDirection === 'out') {
								// update visibility state using style overrides before baseClearData animation removes inline visibility style to avoid flickering
								componentsStylesOverrides.update(
									targets.reduce(
										(styles, compId) => ({
											...styles,
											[compId]: { visibility: 'hidden !important' },
										}),
										{}
									)
								)
							}

							removeIsAnimatingClass(window, targets, domSelectors)

							// the animation is persisted with fill='both' so we need to clear it
							setTimeout(() => {
								animations.forEach((anim) => anim.cancel())
								animations.length = 0
							}, 0)
						}

						// users are instructed not to await promises that require dom on $w.onReady()
						// https://support.wix.com/en/article/corvid-cant-preview-or-view-page-if-using-await-or-return-with-certain-functions-in-onready
						// so no deadlock can happen here between $w.onReady() and viewer waiting for all appWillLoadPage()s
						await Promise.all([
							appDidMountPromise,
							...targets.map((compId) => compsLifeCycle.waitForComponentToRender(getInnerMostItemId(compId))),
						])

						if (reducedMotion) {
							onStart()
							onEnd()
							resolve()
							return
						}

						// keep the last frame persistent until we finish updating visibility
						animationData.fill = 'both'

						targets.forEach((targetId) => {
							animations.push(
								animationManager.api.play(targetId, animationData, {
									start: [onStart],
									end: [onEnd, resolve],
								})
							)
						})
					})
				},
			},
		}),
	})
)

const addIsAnimatingClass = (window: BrowserWindow, targets: Array<string>, domSelectors: IDomSelectors) => {
	targets.forEach((compId: string) => {
		const el = domSelectors.getByCompId(compId, window?.document)
		if (el) {
			el.classList.add('is-animating')
		}
	})
}

const removeIsAnimatingClass = (window: BrowserWindow, targets: Array<string>, domSelectors: IDomSelectors) => {
	window!.requestAnimationFrame(() => {
		targets.forEach((compId) => {
			const el = domSelectors.getByCompId(compId, window?.document)
			if (el) {
				el.classList.remove('is-animating')
			}
		})
	})
}
