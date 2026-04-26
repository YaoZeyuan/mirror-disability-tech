import { Pointer } from 'kuliso'
import type { IDomSelectors } from '@wix/thunderbolt-symbols'
import type {
	AnimationApi,
	ViewportManagerFactory,
	ViewportManager,
	EffectData,
	ScrubManager,
	Triggers,
	TimeEffectData,
	ExtendedPointerScene,
	ScrubEffectData,
} from './types'
import type { BreakpointRange, ScrubTriggerVariant } from '@wix/thunderbolt-becky-types'
import { NavigationSessionStorageManager } from './NavigationSessionStorageManager'

export class AnimationManager {
	api: AnimationApi
	viewportManager: ViewportManager | null
	isResponsive: boolean
	isReducedMotion: boolean
	useCSSTime: boolean
	animationData: { [effectId: string]: Array<EffectData> }
	private domSelectors: IDomSelectors
	private scrubManagers: Array<ScrubManager>
	private scrubTriggers: Record<string, ScrubTriggerVariant>
	private callbacks: {
		[effectId: string]: {
			end: Array<() => void>
			start: Array<() => void>
		}
	}
	private breakpointRanges: Array<BreakpointRange>
	private activeListeners: Array<MediaQueryList>
	private scrubUpdateRequest: NodeJS.Timeout | null
	private breakpointChangeHandler: (event: MediaQueryListEvent) => void
	private disabledPointerScenes: Record<string, Array<PointerScene>>
	private played: Record<string, boolean>
	private navigationSessionStorageManager: NavigationSessionStorageManager

	constructor(
		animationApi: AnimationApi,
		viewport: ViewportManagerFactory,
		options: { isResponsive: boolean; reducedMotion: boolean; useCSSTime?: boolean },
		domSelectors: IDomSelectors,
		browserWindow?: Window
	) {
		this.api = animationApi
		this.isResponsive = options.isResponsive
		this.isReducedMotion = options.reducedMotion
		this.useCSSTime = options.useCSSTime || false
		this.viewportManager = options.reducedMotion ? null : viewport({ manager: this })
		this.animationData = {}
		this.domSelectors = domSelectors
		this.scrubManagers = []
		this.scrubTriggers = {}
		this.callbacks = {}
		this.breakpointRanges = []
		this.activeListeners = []
		this.scrubUpdateRequest = null
		this.breakpointChangeHandler = this._breakpointChangeHandler.bind(this)
		this.disabledPointerScenes = {}
		this.navigationSessionStorageManager = new NavigationSessionStorageManager(
			'wix-motion-played-animations',
			browserWindow
		)
		this.played = this.navigationSessionStorageManager.getFromSession()
		this._syncPlayedStateToDom()
	}

	wasPlayed(targetId: string): boolean {
		return !!this.played[targetId]
	}

	setAsPlayed(targetId: string): void {
		this.played[targetId] = true
		this.navigationSessionStorageManager.saveToSession(this.played)
	}

	private _syncPlayedStateToDom(): void {
		for (const targetId of Object.keys(this.played)) {
			if (this.played[targetId]) {
				this._setAnimationState(targetId)
			}
		}
	}

	private _clearPlayed(): void {
		this.played = {}
		this.navigationSessionStorageManager.clearFromSession()
	}

	init(animationData: { [effectId: string]: Array<EffectData> }, scrubAnimationBreakpoints: Array<BreakpointRange>) {
		this.animationData = animationData
		this.breakpointRanges = scrubAnimationBreakpoints
		this.scrubUpdateRequest = null
		this._observeBreakpointChange()
	}

	addExternalAnimationData(
		animationData: { [effectId: string]: Array<EffectData> },
		scrubTriggers: { [effectId: string]: ScrubTriggerVariant },
		isHoverSupported?: boolean
	) {
		Object.assign(this.animationData, animationData)
		const scrubTriggersWithoutPointer = Object.keys(scrubTriggers)
			.filter((key) => scrubTriggers[key].trigger !== 'pointer-move')
			.reduce(
				(res, key) => {
					res[key] = scrubTriggers[key]
					return res
				},
				{} as { [effectId: string]: ScrubTriggerVariant }
			)
		this.trigger({ scrub: isHoverSupported ? scrubTriggers : scrubTriggersWithoutPointer })
	}

	trigger(triggers: Triggers = {}, isBreakpointChange?: boolean) {
		if (triggers.scrub) {
			if (isBreakpointChange) {
				// reset triggers state
				this.scrubTriggers = triggers.scrub

				if (!this.scrubUpdateRequest) {
					this.scrubUpdateRequest = setTimeout(() => {
						this._updateScrubManagers(this.scrubTriggers, true)
						this.scrubUpdateRequest = null
					}, 0)
				}
			} else {
				Object.assign(this.scrubTriggers, triggers.scrub)
				this._updateScrubManagers(triggers.scrub)
			}

			return
		}

		const viewportWidth = this.isResponsive ? window.innerWidth : 0

		if (triggers.play?.length) {
			triggers.play.forEach(({ effectId, targetId, toggle }) => {
				const animation = this._getEffectVariationForCurrentBreakpoint(effectId, viewportWidth)

				if (animation?.namedEffect || animation?.customEffect) {
					this._playAnimation(animation, effectId, { targetId, toggle })
				}
			})
		}

		if (triggers.resume?.length) {
			triggers.resume.forEach(({ effectId, targetId }) => {
				if (this.disabledPointerScenes[effectId]) {
					this.disabledPointerScenes[effectId].forEach((scene) => (scene.disabled = false))
					return
				}

				const animation = this._getEffectVariationForCurrentBreakpoint(effectId, viewportWidth)

				if (animation?.namedEffect || animation?.customEffect) {
					this._resumeOrPlayAnimation(animation, effectId, { targetId })
				}
			})
		}

		if (triggers.hold?.length) {
			triggers.hold.forEach(({ effectId, targetId }) => {
				if (this.disabledPointerScenes[effectId]) {
					this.disabledPointerScenes[effectId].forEach((scene) => (scene.disabled = true))
					return
				}

				const animation = this._getEffectVariationForCurrentBreakpoint(effectId, viewportWidth)

				if (animation?.namedEffect || animation?.customEffect) {
					this._pauseAnimation(targetId, animation)
				}
			})
		}
	}

	cancelAll() {
		this.api.cancelScrub(this.scrubManagers)
		this.api.cancelAll()
		this.scrubTriggers = {}
		this._clearPlayed()
		this.clear()
	}

	clear() {
		this.animationData = {}
		this.activeListeners.forEach((listener) => listener.removeEventListener('change', this.breakpointChangeHandler))
		this.activeListeners.length = 0
		this.disabledPointerScenes = {}
		this.viewportManager?.disconnect()
	}

	addEffectCallback(effectId: string, triggerType: string, callback: () => void) {
		const eventName = triggerType === 'animation-end' ? 'end' : 'start'

		if (!this.callbacks[effectId]) {
			this.callbacks[effectId] = { end: [], start: [] }
		}

		this.callbacks[effectId][eventName].push(callback)
	}

	clearEffectCallbacks(effectId: string) {
		delete this.callbacks[effectId]
	}

	_updateScrubManagers(triggers: Triggers['scrub'] = {}, clearExisting: boolean = false) {
		if (this.scrubManagers.length && clearExisting) {
			this.scrubManagers.forEach((manager) => manager.destroy())
			this.scrubManagers.length = 0
		}

		const effectIds = Object.keys(triggers)
		const viewportWidth = this.isResponsive ? window.innerWidth : 0
		const scrubAnimations = {} as { [effectId: string]: ScrubEffectData }

		for (const effectId of effectIds) {
			const animation = this._getEffectVariationForCurrentBreakpoint(effectId, viewportWidth)

			if (animation?.type === 'ScrubAnimationOptions') {
				scrubAnimations[effectId] = animation
			}
		}

		// create new Scrub managers
		this.scrubManagers.push(...this.api.startScrub(triggers, scrubAnimations))

		// optimize Pointer scenes to be disabled when exiting viewport
		this.scrubManagers.forEach((manager) => {
			if (manager instanceof Pointer) {
				manager.config.scenes.forEach((scene: ExtendedPointerScene) => {
					if (scene.target && scene.centeredToTarget && scene.isHitAreaRoot) {
						const container = scene.target.closest('[data-block-level-container]') as HTMLElement

						const effectId = scene.effectId

						if (container) {
							if (this.viewportManager && effectId) {
								if (!this.disabledPointerScenes[effectId]) {
									this.disabledPointerScenes[effectId] = []
								}
								this.disabledPointerScenes[effectId].push(scene)
								const targetId = this.domSelectors.getElementCompId(scene.target)
								this.viewportManager.observe(container, { effectId, targetId })
							}
						} else {
							// no container so abort the optimization - just enable the effect
							scene.disabled = false
						}
					}
				})
			}
		})
	}

	_getEffectVariationForCurrentBreakpoint(effectId: string, viewportWidth: number) {
		const variations = this.animationData[effectId]
		if (!variations) {
			return
		}
		const defaultVariation = variations.find((variation) => !variation.variants?.length) as EffectData

		if (viewportWidth) {
			return (
				// @ts-expect-error
				variations.findLast((variation) => {
					return (variation.variants as Array<BreakpointRange>)?.some((variant) => {
						if (variant.max && variant.max < viewportWidth) {
							return false
						}

						if (variant.min && variant.min > viewportWidth) {
							return false
						}

						return true
					})
				}) || defaultVariation
			)
		}

		return defaultVariation
	}

	_playAnimation(animationData: TimeEffectData, effectId: string, overrides: Partial<EffectData> = {}) {
		const updatedAnimation = { ...animationData, ...overrides, effectId } as TimeEffectData
		const { targetId, iterations, allowReplay } = updatedAnimation

		if (iterations === 0) {
			this._setAnimationPlaystateTrigger(effectId, targetId)
			return
		}

		if (allowReplay === 'never' && this.wasPlayed(targetId)) {
			if (this.useCSSTime) {
				this._removePendingCSSAnimation(targetId, updatedAnimation)
			} else {
				this._setAnimationState(targetId)
			}
			return
		}

		const callbacks = this._getAnimationCallbacks(effectId, targetId, updatedAnimation)

		if (this.useCSSTime) {
			this.api.playCSS(targetId, updatedAnimation, callbacks)
		} else {
			this.api.play(targetId, updatedAnimation, callbacks)
		}

		if (allowReplay === 'never') {
			this.setAsPlayed(targetId)
		}
	}

	_resumeOrPlayAnimation(animationData: TimeEffectData, effectId: string, overrides: Partial<EffectData> = {}) {
		const updatedAnimation = { ...animationData, ...overrides, effectId } as TimeEffectData
		const targetId = updatedAnimation.targetId
		const animation = this.api.getTargetAnimation(targetId, updatedAnimation)
		const callbacks = this._getAnimationCallbacks(effectId, targetId, updatedAnimation)
		animation ? animation.play() : this.api.play(targetId, updatedAnimation, callbacks)
	}

	_pauseAnimation(targetId: string, data: TimeEffectData) {
		const animation = this.api.getTargetAnimation(targetId, data)
		animation?.pause()
	}

	_setAnimationPlaystateTrigger(effectId: string, targetId: string) {
		const targetElement = this.domSelectors.getByCompId(targetId)
		if (targetElement && this.viewportManager) {
			const observedParent = (targetElement.closest('[data-block-level-container]') || targetElement) as HTMLElement
			this.viewportManager.observe(observedParent, { effectId, targetId })
		}
	}

	_observeBreakpointChange() {
		this.breakpointRanges.forEach((range) => {
			const matchMediaString = getMatchMediaString(range)
			const mediaQueryList = window.matchMedia(matchMediaString)
			this.activeListeners.push(mediaQueryList)
			mediaQueryList.addEventListener('change', this.breakpointChangeHandler)
		})
	}

	_breakpointChangeHandler(event: MediaQueryListEvent) {
		if (event.matches) {
			if (!this.scrubUpdateRequest) {
				this.scrubUpdateRequest = setTimeout(() => {
					this._updateScrubManagers(this.scrubTriggers, true)
					this.scrubUpdateRequest = null
				}, 0)
			}
		}
	}

	_removePendingCSSAnimation(targetId: string, data: TimeEffectData) {
		const element = this.domSelectors.getByCompId(targetId)
		if (element) {
			this.api.cancel(element, data)
		}
	}

	_setAnimationState(targetId: string) {
		const element = this.domSelectors.getByCompId(targetId)
		if (element) {
			element.dataset.motionEnter = 'done'
		}
	}

	_getAnimationCallbacks(effectId: string, targetId: string, data: TimeEffectData) {
		const start: (() => void)[] = [],
			end: (() => void)[] = [],
			abort: (() => void)[] = []
		let aborted = false

		if (data.fill === 'backwards' || data.fill === 'both') {
			const _updateEnterState = () => {
				this._setAnimationState(targetId)
			}

			if (this.useCSSTime) {
				end.push(_updateEnterState)

				const _abortCallback = () => {
					if (!aborted) {
						_updateEnterState()
						aborted = true
					}
				}
				abort.push(_abortCallback)
			} else {
				start.push(_updateEnterState)
			}
		}

		return {
			start: [...start, ...(this.callbacks[effectId]?.start || [])],
			end: [...end, ...(this.callbacks[effectId]?.end || [])],
			abort,
		}
	}
}

const getMatchMediaString = (range: BreakpointRange): string => {
	const mediaString = []

	if (range.max) {
		mediaString.push(`(max-width:${range!.max}px)`)
	}
	if (range.min) {
		mediaString.push(`(min-width:${range!.min}px)`)
	}

	return mediaString.join(' and ')
}
