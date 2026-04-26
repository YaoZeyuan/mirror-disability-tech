import type { ViewportManager, EffectTriggerData } from './types'
import type { AnimationManager } from './AnimationManager'

export default function init({ manager }: { manager: AnimationManager }): ViewportManager {
	const INTERSECTION_THRESHOLD = 0
	const EXIT_ROOT_MARGIN = '50%'
	const ENTRY_ROOT_MARGIN = '10%'

	const observers: {
		entry: IntersectionObserver
		exit: IntersectionObserver
	} = {
		entry: getObserver(intersectionEntryHandler, INTERSECTION_THRESHOLD, ENTRY_ROOT_MARGIN),
		exit: getObserver(intersectionExitHandler, INTERSECTION_THRESHOLD, EXIT_ROOT_MARGIN),
	}
	const targetToEffectsMap: WeakMap<HTMLElement, { isIntersecting: boolean; effects: Set<EffectTriggerData> }> =
		new WeakMap()

	/**
	 * build an intersection observer
	 * @param callback
	 * @param threshold
	 * @param rootMarginInPixels
	 * @returns {IntersectionObserver}
	 */
	function getObserver(callback: IntersectionObserverCallback, threshold: number, rootMarginInPixels: string = '0px') {
		const options = {
			root: null, // document
			rootMargin: rootMarginInPixels,
			threshold: [threshold],
		}

		return new window.IntersectionObserver(callback, options)
	}

	const getEffectDataFromTarget = (target: HTMLElement) => {
		return Array.from(targetToEffectsMap.get(target)?.effects || [])
	}

	/**
	 * trigger animation when element is it NOT visible
	 * @param entries
	 */
	function intersectionExitHandler(entries: Array<IntersectionObserverEntry>) {
		const effectDataEntries = entries
			.filter((entry) => {
				const { isIntersecting, target } = entry
				if (!isIntersecting) {
					// if element has exited, mark it as not intersecting for future observations
					targetToEffectsMap.get(target as HTMLElement)!.isIntersecting = false
				}
				return !isIntersecting
			})
			.flatMap((entry) => getEffectDataFromTarget(entry.target as HTMLElement))

		manager.trigger({ hold: effectDataEntries })
	}

	/**
	 * trigger animations when element is visible
	 * @param entries
	 */
	function intersectionEntryHandler(entries: Array<IntersectionObserverEntry>) {
		const effectDataEntries = entries
			.filter((entry) => {
				const { isIntersecting, target } = entry
				if (isIntersecting) {
					// if element has entered, mark it as intersecting for future observations
					targetToEffectsMap.get(target as HTMLElement)!.isIntersecting = true
				}
				return isIntersecting
			})
			.flatMap((entry) => getEffectDataFromTarget(entry.target as HTMLElement))

		manager.trigger({ resume: effectDataEntries })
	}

	/**
	 * Observe elements and save to observers array
	 * @param el
	 * @param {EffectTriggerData} effectTriggerData
	 */
	function observeElement(el: HTMLElement, effectTriggerData: EffectTriggerData) {
		const targetEffects = targetToEffectsMap.get(el)

		if (targetEffects) {
			// if element is already observed, add the effect to the set
			targetEffects.effects.add(effectTriggerData)

			if (targetEffects.isIntersecting) {
				// if element is already intersecting, trigger the effect
				manager.trigger({ resume: [effectTriggerData] })
			}
		} else {
			// if element is not observed, create a new entry
			targetToEffectsMap.set(el, {
				effects: new Set([effectTriggerData]),
				isIntersecting: false,
			})

			// observe the element
			observers.entry.observe(el)
			observers.exit.observe(el)
		}
	}

	/**
	 * Unobserve all elements for a specific page
	 */
	function disconnectObserversOnNavigation() {
		observers.entry.disconnect()
		observers.exit.disconnect()
	}

	return {
		observe: observeElement,
		disconnect: disconnectObserversOnNavigation,
	}
}
