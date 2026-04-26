import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IComponentsStylesOverrides,
	ICompsLifeCycle,
	IPageDidMountHandler,
	SdkHandlersProvider,
} from '@wix/thunderbolt-symbols'
import {
	AppDidMountPromiseSymbol,
	BrowserWindowSymbol,
	ComponentsStylesOverridesSymbol,
	CompsLifeCycleSym,
	PageFeatureConfigSymbol,
} from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import type { AnimationData, AnimationsPageConfig, IAnimations, WixCodeAnimationsHandlers } from '../types'
import { Animations, name } from '../symbols'
import { createPromise, getInnerMostItemId } from '@wix/thunderbolt-commons'

const CLEAR_PROPS = 'clip,clipPath,webkitClipPath,opacity,transform,visibility'

export const wixCodeHandlersProvider = withDependencies(
	[
		Animations,
		ComponentsStylesOverridesSymbol,
		BrowserWindowSymbol,
		AppDidMountPromiseSymbol,
		CompsLifeCycleSym,
		named(PageFeatureConfigSymbol, name),
		DomSelectorsSymbol,
	] as const,
	(
		animations: IAnimations,
		componentsStylesOverrides: IComponentsStylesOverrides,
		window,
		appDidMountPromise: Promise<unknown>,
		compsLifeCycle: ICompsLifeCycle,
		featureConfig: AnimationsPageConfig,
		domSelectors: IDomSelectors
	): SdkHandlersProvider<WixCodeAnimationsHandlers> & IPageDidMountHandler => {
		const addIsAnimatingClass = (targets: Array<string>) => {
			targets.forEach((compId: string) => {
				const el = domSelectors.getByCompId(compId, window!.document)
				if (el) {
					el.classList.add('is-animating')
				}
			})
		}

		const removeIsAnimatingClass = (targets: Array<string>) => {
			window!.requestAnimationFrame(() => {
				targets.forEach((compId) => {
					const el = domSelectors.getByCompId(compId, window!.document)
					if (el) {
						el.classList.remove('is-animating')
					}
				})
			})
		}

		const { resolver: pageDidMountResolver, promise: pageDidMountPromise } = createPromise()
		return {
			getSdkHandlers: () => ({
				[name]: {
					runAnimation: async (animationData: AnimationData, animationDirection: 'in' | 'out'): Promise<void> => {
						const targets = Array.isArray(animationData.targetId) ? animationData.targetId : [animationData.targetId]
						let resolvePromise: () => void
						const animationCompletePromise = new Promise<void>((resolve) => {
							resolvePromise = resolve
						})
						const animatorManager = await animations.getInstance()

						const baseClearData = {
							name: 'BaseClear',
							targetId: animationData.targetId,
							duration: 0,
							delay: 0,
							params: {
								props: CLEAR_PROPS,
								immediateRender: false,
							},
						}
						addIsAnimatingClass(targets)
						animationData.params = {
							...animationData.params,
							callbacks: {
								onStart() {
									if (animationDirection === 'in') {
										componentsStylesOverrides.update(
											targets.reduce((styles, compId) => ({ ...styles, [compId]: { visibility: null } }), {})
										)
									}
								},
								onComplete() {
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
									removeIsAnimatingClass(targets)
								},
							},
						}

						// users are instructed not to await promises that require dom on $w.onReady()
						// https://support.wix.com/en/article/corvid-cant-preview-or-view-page-if-using-await-or-return-with-certain-functions-in-onready
						// so no deadlock can happen here between $w.onReady() and viewer waiting for all appWillLoadPage()s
						await Promise.all([
							appDidMountPromise,
							pageDidMountPromise,
							...(featureConfig.isPreview
								? []
								: targets.map((compId) => compsLifeCycle.waitForComponentToRender(getInnerMostItemId(compId)))),
						])

						// onStart function won't be called if the duration is 0 (https://greensock.com/docs/v3/GSAP/Timeline)
						animationData = { ...animationData, duration: animationData.duration || 0.00001 }

						animatorManager.runSequence(
							[
								{ type: 'Animation', data: animationData },
								{ type: 'Animation', data: baseClearData },
							],
							{
								callbacks: {
									onComplete: () => resolvePromise(),
									// TODO maybe onInterrupt and onReverseComplete not needed for platform handler?
									onInterrupt: () => resolvePromise(),
								},
							}
						)
						return animationCompletePromise
					},
				},
			}),
			pageDidMount() {
				pageDidMountResolver()
			},
		}
	}
)
