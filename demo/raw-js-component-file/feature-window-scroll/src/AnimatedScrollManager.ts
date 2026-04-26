import type { ViewMode } from '@wix/thunderbolt-symbols'
import type { ScrollToCallbacks } from './types'
import { ScrollAnimationResult } from './types'
import { calcScrollDuration } from './scrollUtils'
import { sineInOut } from '@wix/wow-utils/easing'

const MAX_TARGET_UPDATES = 10 // Maximum number of times setTargetY can be called

/**
 * Manages smooth scrolling animations with the ability to abort ongoing animations
 */
export class AnimatedScrollManager {
	private animationFrameId: number | null = null
	private isAborted = false
	private currentTargetY: number
	private updateCount = 0
	private targetUpdateCount = 0

	constructor(
		private window: Window,
		private viewMode: ViewMode,
		private reducedMotion: boolean,
		private getScrollableElement: () => Window | HTMLElement,
		private getTopLocation: (element: HTMLElement | Window) => number,
		private addScrollInteractionEventListeners: (handler: () => void) => void,
		private getCompClientYForScroll: (compNode: HTMLElement, openLightboxId: string | undefined) => number,
		private removeScrollInteractionEventListeners: (handler: () => void) => void
	) {
		this.currentTargetY = 0
	}

	/**
	 * Scrolls to the specified Y position with a smooth animation.
	 * @param targetY - The target Y position to scroll to
	 * @param callbacks - Optional callbacks for animation events:
	 *   - onComplete: Called when animation completes successfully
	 *   - onAbort: Called when animation is aborted by user interaction
	 * @param targetSetterCallback - Optional callback that provides a function to update
	 *   the target Y position during animation. This allows for dynamic target updates
	 *   while respecting the MAX_TARGET_UPDATES limit.
	 * @returns A promise that resolves with the animation result:
	 *   - ScrollAnimationResult.Completed: Animation completed successfully
	 *   - ScrollAnimationResult.Aborted: Animation was interrupted by user
	 */
	public scrollTo(
		targetY: number,
		callbacks: ScrollToCallbacks = {},
		targetSetterCallback?: (setTargetYCallback: (newTargetY: number) => void) => void
	): Promise<ScrollAnimationResult> {
		// Initialize animation state
		this.currentTargetY = targetY
		this.isAborted = false
		this.updateCount = 0
		this.targetUpdateCount = 0
		this.animationFrameId = null

		const scrollableElement = this.getScrollableElement()

		// Handle reduced motion preference - perform instant scroll
		if (this.reducedMotion) {
			scrollableElement.scrollTo({ top: targetY })
			callbacks.onComplete?.()
			return Promise.resolve(ScrollAnimationResult.Completed)
		}

		// Cancel any ongoing animation
		if (this.animationFrameId !== null) {
			cancelAnimationFrame(this.animationFrameId)
			this.animationFrameId = null
		}

		return new Promise((resolve) => {
			// Handler for user scroll interaction - aborts the animation
			const scrollAbortHandler = () => {
				this.isAborted = true
				this.removeScrollInteractionEventListeners(scrollAbortHandler)
				scrollableElement.scrollTo({ top: this.getTopLocation(scrollableElement) })
				if (this.animationFrameId !== null) {
					cancelAnimationFrame(this.animationFrameId)
					this.animationFrameId = null
				}
				resolve(ScrollAnimationResult.Aborted)
			}

			// Set up scroll interaction listeners
			this.addScrollInteractionEventListeners(scrollAbortHandler)

			// Calculate animation parameters
			const startY = this.getTopLocation(scrollableElement)
			const isMobile = this.viewMode === 'mobile'
			const totalDuration = calcScrollDuration(this.window.pageYOffset, this.currentTargetY, isMobile) * 1000
			const startTime = performance.now()

			// Animation step function - handles the smooth scrolling
			const scrollStep = (timestamp: number) => {
				if (this.isAborted) {
					return
				}

				// Calculate progress and new position
				const elapsed = timestamp - startTime
				const progress = Math.min(elapsed / totalDuration, 1)

				const currentDistance = this.currentTargetY - startY
				const newPosition = startY + currentDistance * sineInOut(progress)
				scrollableElement.scrollTo(0, newPosition)

				// Continue animation or complete
				if (elapsed < totalDuration) {
					this.animationFrameId = this.window.requestAnimationFrame(scrollStep)
				} else {
					scrollableElement.scrollTo(0, this.currentTargetY)
					this.animationFrameId = null
					this.removeScrollInteractionEventListeners(scrollAbortHandler)
					callbacks.onComplete?.()
					resolve(ScrollAnimationResult.Completed)
				}
			}

			// Start the animation
			this.window.requestAnimationFrame(scrollStep)

			// Set up target update callback if provided
			if (targetSetterCallback) {
				targetSetterCallback(this.setTargetY.bind(this))
			}
		})
	}

	/**
	 * Sets a new target Y position during the animation
	 * @param newTargetY - The new target Y position
	 */
	private setTargetY(newTargetY: number): void {
		if (this.targetUpdateCount >= MAX_TARGET_UPDATES) {
			return
		}

		this.currentTargetY = newTargetY
		this.targetUpdateCount++
	}

	/**
	 * Observes the Y position of an element during scroll animation
	 * @param element - The element to observe
	 * @param openLightboxId - The ID of the open lightbox
	 * @param initialY - The initial Y position
	 * @param callback - Callback function to handle Y position changes
	 * @returns A function to stop observing
	 */
	public observeElementYPosition(
		element: HTMLElement,
		openLightboxId: string | undefined,
		initialY: number,
		callback: (newY: number, prevY: number) => void
	): () => void {
		// State variables
		let isRunning = true
		let frameId: number | null = null
		let prevY: number = initialY
		let updateCount = 0

		/**
		 * Stops the observation process
		 */
		const stop = () => {
			isRunning = false
			if (frameId !== null) {
				cancelAnimationFrame(frameId)
				frameId = null
			}
		}

		/**
		 * Checks the current position of the element and updates if needed
		 */
		const check = async () => {
			// Exit if observation has been stopped
			if (!isRunning) {
				return
			}

			// Get the current Y position of the element
			const currentY = await this.getAnimationFrameClientYForScroll(element, openLightboxId || '')

			// Only proceed if the position has changed
			if (currentY !== prevY) {
				updateCount++

				// Only update if we haven't exceeded the maximum number of updates
				if (updateCount <= MAX_TARGET_UPDATES) {
					// Notify the callback of the position change
					callback(currentY, prevY)
					prevY = currentY
				} else {
					// Stop observing after reaching the limit
					stop()
				}
			}

			// Schedule the next check if still running
			if (isRunning) {
				frameId = requestAnimationFrame(() => check())
			}
		}

		// Start the observation process
		frameId = requestAnimationFrame(() => check())

		// Return the stop function to allow manual cancellation
		return stop
	}

	/**
	 * Gets the client Y position for scrolling to an element using requestAnimationFrame
	 * @param compNode The component node to get the position for
	 * @param openLightboxId The ID of the open lightbox, if any
	 * @returns A promise that resolves to the client Y position
	 * @public
	 */
	public async getAnimationFrameClientYForScroll(
		compNode: HTMLElement,
		openLightboxId: string | undefined
	): Promise<number> {
		return new Promise<number>((resolve) => {
			this.window.requestAnimationFrame(() => {
				resolve(this.getCompClientYForScroll(compNode, openLightboxId))
			})
		})
	}
}
