import { Scroll } from 'fizban'
import { Pointer } from 'kuliso'
import type { AnimationGroup, AnimationOptions, ScrubScrollScene, ScrubPointerScene } from '@wix/motion'
import {
	getWebAnimation,
	getScrubScene,
	getElementAnimation,
	prepareAnimation,
	getElementCSSAnimation,
} from '@wix/motion'
import type { PointerMoveTriggerParams, ScrubTriggerVariant } from '@wix/thunderbolt-becky-types'
import type {
	MotionPageConfig,
	PointerManager,
	PointerSceneFactory,
	ScrollManager,
	ScrollSceneFactory,
	ScrubManager,
	NativeScrollFactory,
	AnimationCallbacks,
	TimeEffectData,
	ScrubEffectData,
	ScrubOptions,
} from './types'
import type { IPropsStore, IDomSelectors } from '@wix/thunderbolt-symbols'
import { getDisplayedId, getFullId, getTemplateItemId, REPEATER_DELIMITER } from '@wix/thunderbolt-commons'
import { getNearestScrollRoot } from './utils'

export const animationApiFactory = (
	domSelectors: IDomSelectors,
	repeaterTemplateToParentMap?: MotionPageConfig['repeaterTemplateToParentMap'],
	propsStore?: IPropsStore,
	useCSSTime?: boolean
) => {
	return {
		getTargetAnimation(targetId: string, data: TimeEffectData) {
			return useCSSTime ? getElementCSSAnimation(targetId, data) : getElementAnimation(targetId, data.effectId!)
		},
		play(target: string, data: TimeEffectData, callbacks?: AnimationCallbacks) {
			if (data.toggle) {
				const _animation = getElementAnimation(target, data.effectId!)

				if (_animation) {
					_animation.reverse()
					return _animation
				}
			}

			if (data.toggle === 'reverse') {
				data = { ...data, reversed: true }
			}

			const animation = getWebAnimation(target, data) as AnimationGroup
			if (data.registerCustomEffect) {
				data.registerCustomEffect(animation.getProgress)
			}

			let onStart
			if (callbacks?.start?.length) {
				onStart = () => {
					callbacks.start!.forEach((callback) => callback())
				}
			}

			if (callbacks?.end?.length) {
				animation.onFinish(() => {
					callbacks.end!.forEach((callback) => callback())
				})
			}

			animation.play(onStart)

			return animation
		},
		playCSS(target: string, data: TimeEffectData, callbacks?: AnimationCallbacks) {
			const animationGroup = getElementCSSAnimation(target, data)

			if (!animationGroup) {
				return
			}

			animationGroup.onAbort(() => {
				if (callbacks?.abort?.length) {
					callbacks.abort!.forEach((callback) => callback())
				}
			})

			animationGroup.onFinish(() => {
				if (callbacks?.end?.length) {
					callbacks.end!.forEach((callback) => callback())
				}
			})

			prepareAnimation(target, data, () =>
				animationGroup.play(() => {
					if (callbacks?.start?.length) {
						callbacks.start!.forEach((callback) => callback())
					}
				})
			)
		},
		cancel(target: string | HTMLElement, data: TimeEffectData) {
			const animationGroup = getElementCSSAnimation(target, data)

			if (animationGroup) {
				animationGroup.cancel()
			}
		},
		cancelAll() {
			document.documentElement.getAnimations({ subtree: true }).forEach((animation) => animation.cancel())
		},
		startScrub(
			triggers: { [effectId: string]: ScrubTriggerVariant },
			animationMap: { [effectId: string]: ScrubEffectData },
			options?: ScrubOptions
		) {
			const scrollRootsMap = new Map<HTMLElement | Window, Array<ScrubScrollScene>>()
			const scrollManagers: Array<ScrollManager> = []
			const pointerRootsMap = new Map<HTMLElement, Array<ScrubPointerScene>>()
			const pointerManagers: Array<PointerManager> = []
			const hasViewTimeline = 'ViewTimeline' in window

			function addScroll(factory: ScrollSceneFactory | NativeScrollFactory, source: HTMLElement, targetId: string) {
				const factoryResult = factory(targetId) as ScrubScrollScene | Array<ScrubScrollScene>
				const scenes: Array<ScrubScrollScene> = Array.isArray(factoryResult) ? factoryResult : [factoryResult]
				let root

				if (hasViewTimeline) {
					root = document.documentElement
				} else {
					scenes.forEach((scene) => {
						if (!scene.viewSource) {
							scene.viewSource = source
						}
						const sourceId = domSelectors.getElementCompId(source)
						scene.groupId = `${targetId}-${sourceId || ''}`
					})
					root = getNearestScrollRoot(source.parentElement as HTMLElement | null)
				}

				if (!scrollRootsMap.has(root)) {
					scrollRootsMap.set(root, [])
				}

				scrollRootsMap.get(root)!.push(...scenes)
			}

			function addPointer(
				factory: PointerSceneFactory,
				source: HTMLElement,
				targetId: string,
				effectId: string,
				triggerParams: PointerMoveTriggerParams
			) {
				const isHitAreaRoot = triggerParams.hitArea === 'root'
				const scene = factory(targetId, isHitAreaRoot && !options?.forceEnableScene)
				const pointerScene = {
					isHitAreaRoot,
					effectId,
					eventSource: options?.pointerSource,
					...scene,
				}
				const triggerElement = isHitAreaRoot ? document.documentElement : source

				if (!pointerRootsMap.has(triggerElement)) {
					pointerRootsMap.set(triggerElement, [])
				}

				pointerRootsMap.get(triggerElement)!.push(pointerScene)
			}

			Object.entries(triggers).forEach(([effectId, trigger]) => {
				if (!animationMap[effectId]) {
					return
				}

				const isScroll = trigger.trigger === 'view-progress'
				const isPointer = trigger.trigger === 'pointer-move'
				const { targetId, namedEffect, customEffect } = animationMap[effectId]

				if ((namedEffect || customEffect) && (isPointer || isScroll)) {
					const triggerElement = domSelectors.getByCompId(trigger.componentId) as HTMLElement

					if (triggerElement) {
						const targetIds = this._getScrubTargets(trigger.componentId, targetId)
						targetIds.forEach((target: string) => {
							const scrubScene = this._createScrub(animationMap[effectId], {
								...trigger,
								element: triggerElement,
							})

							return isScroll
								? addScroll(scrubScene.factory as ScrollSceneFactory, triggerElement, target)
								: addPointer(
										scrubScene.factory as unknown as PointerSceneFactory,
										triggerElement,
										target,
										effectId,
										trigger.params as PointerMoveTriggerParams
									)
						})
					} else {
						//	probably the trigger element is a child of a Repeater
						const triggerElements = Array.from(
							domSelectors.querySelectorAll(`[id^="${trigger.componentId}${REPEATER_DELIMITER}"]`)
						) as Array<HTMLElement>

						triggerElements.forEach((sourceElement: Element) => {
							const scrubScene = this._createScrub(animationMap[effectId], {
								...trigger,
								element: sourceElement as HTMLElement,
							})
							// we only support animating inside same element of triggering Item with view-progress
							const sourceElementId = domSelectors.getElementCompId(sourceElement)
							const target = getDisplayedId(getFullId(targetId), getTemplateItemId(sourceElementId))
							isScroll
								? addScroll(scrubScene.factory as ScrollSceneFactory, sourceElement as HTMLElement, target)
								: addPointer(
										scrubScene.factory as unknown as PointerSceneFactory,
										sourceElement as HTMLElement,
										target,
										effectId,
										trigger.params as PointerMoveTriggerParams
									)
						})
					}
				}
			})

			scrollRootsMap.forEach((scenes, root) => {
				if (scenes.length) {
					if (hasViewTimeline) {
						scrollManagers.push(...scenes)
					} else {
						const scrollManager = new Scroll({
							root,
							scenes,
							observeViewportEntry: false,
							observeViewportResize: false,
							observeSourcesResize: false,
							observeContentResize: true,
							contentRoot: document.getElementById('site-root'),
						})
						scrollManagers.push(scrollManager)

						Promise.all(
							scenes.map((scene: ScrubScrollScene & { ready: Promise<void> }) => scene.ready || Promise.resolve())
						).then(() => {
							scrollManager.start()
						})
					}
				}
			})

			pointerRootsMap.forEach((scenes, root) => {
				const sceneWithTransition = scenes.find((scene: ScrubPointerScene) => scene.transitionDuration)
				const transitionDuration = sceneWithTransition?.transitionDuration
				const transitionEasing = sceneWithTransition?.transitionEasing
				const eventSource = (scenes as Array<ScrubPointerScene & { eventSource?: HTMLElement }>).find(
					(scene) => scene.eventSource
				)?.eventSource
				const allowActiveEvent = scenes.some((scene) => scene.allowActiveEvent)

				const pointerManager = new Pointer({
					root: root === document.documentElement ? undefined : root,
					scenes,
					transitionDuration,
					transitionEasing,
					eventSource,
					allowActiveEvent,
				})
				pointerManager.start()

				pointerManagers.push(pointerManager)
			})

			return [...scrollManagers, ...pointerManagers] as Array<ScrubManager>
		},
		cancelScrub(scrubManagers: Array<ScrubManager>) {
			if (scrubManagers.length) {
				scrubManagers.forEach((manager) => manager.destroy())
				scrubManagers.length = 0
			}
		},
		_createScrub(animation: ScrubEffectData, trigger: ScrubTriggerVariant & { element?: HTMLElement }) {
			return {
				targetId: animation.targetId,
				factory: (targetId: string, disabled = false) => {
					const scene = getScrubScene(targetId || animation.targetId, animation as AnimationOptions, trigger, {
						disabled,
						ignoreScrollMoveOffsets: true,
					})
					if (animation.registerCustomEffect && scene) {
						if (Array.isArray(scene)) {
							animation.registerCustomEffect(scene[0].getProgress)
						} else {
							scene.allowActiveEvent = true
							animation.registerCustomEffect(scene.getProgress)
						}
					}
					return scene
				},
			}
		},
		_getScrubTargets(_: string, targetId: string) {
			const parentRepeater = repeaterTemplateToParentMap?.[targetId]
			const { items = [] } = parentRepeater && propsStore ? propsStore.get(parentRepeater) : {}
			return items.length ? items.map((item: string) => getDisplayedId(targetId, item)) : [targetId]
		},
	}
}
