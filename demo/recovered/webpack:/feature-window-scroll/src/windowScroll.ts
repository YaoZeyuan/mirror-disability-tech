import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import { isSSR, getHeaderElement } from '@wix/thunderbolt-commons'
import type {
	IResolvableReadyForScrollPromise,
	IWindowScrollAPI,
	WindowScrollMasterPageConfig,
	WindowScrollPageConfig,
	ScrollToCallbacks,
} from './types'
import { ScrollAnimationResult } from './types'
import type { Experiments, INavigationManager, IStructureAPI, ViewMode } from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	ExperimentsSymbol,
	PageFeatureConfigSymbol,
	Structure,
	ViewModeSym,
	ReducedMotionSymbol,
	MasterPageFeatureConfigSymbol,
	NavigationManagerSymbol,
} from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'
import { name, ResolvableReadyForScrollPromiseSymbol } from './symbols'
import type { ISiteScrollBlocker } from 'feature-site-scroll-blocker'
import { SiteScrollBlockerSymbol } from 'feature-site-scroll-blocker'
import { isElementTabbable } from 'feature-cyclic-tabbing'
import { AnimatedScrollManager } from './AnimatedScrollManager'

const getPosition = (elem: HTMLElement) => window.getComputedStyle(elem).getPropertyValue('position').toLowerCase()

const getStickyParentId = (compId: string, domSelectors: IDomSelectors): string | undefined => {
	let element = domSelectors.getByCompId(compId)
	let stickyElement
	while (element) {
		const computedStyle = window.getComputedStyle(element)
		if (computedStyle.position === 'sticky') {
			stickyElement = element
		}
		element = element.parentElement as HTMLElement
	}

	return stickyElement?.id
}

const isElementOrAncestorFixed = (element: HTMLElement) => {
	let elem = element
	while (elem && elem !== window.document.body) {
		if (getPosition(elem) === 'fixed') {
			return true
		}
		elem = elem.offsetParent as HTMLElement
	}
	return false
}

const pxToNumber = (pxSize: string) => Number(pxSize.replace('px', ''))

const getScrollableElement = (popupUtils?: ILightboxUtils) => {
	return popupUtils?.getCurrentLightboxId() ? window.document.getElementById('POPUPS_ROOT')! : window
}

const isStickyElement = (element: HTMLElement) => {
	return getPosition(element) === 'sticky'
}

function getTopLocation(element: HTMLElement | Window): number {
	if (element instanceof HTMLElement) {
		return element.scrollTop
	} else {
		return element.scrollY
	}
}

export const WindowScroll = withDependencies(
	[
		BrowserWindowSymbol,
		ViewModeSym,
		ResolvableReadyForScrollPromiseSymbol,
		SiteScrollBlockerSymbol,
		ExperimentsSymbol,
		Structure,
		ReducedMotionSymbol,
		named(PageFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		NavigationManagerSymbol,
		DomSelectorsSymbol,
		optional(LightboxUtilsSymbol),
	],
	(
		window: Window,
		viewMode: ViewMode,
		{ readyForScrollPromise }: IResolvableReadyForScrollPromise,
		siteScrollBlockerApi: ISiteScrollBlocker,
		experiments: Experiments,
		structureApi: IStructureAPI,
		reducedMotion,
		{ headerContainerComponentId }: WindowScrollPageConfig,
		{ isHeaderAnimated }: WindowScrollMasterPageConfig,
		navigationManager: INavigationManager,
		domSelectors: IDomSelectors,
		popupUtils?: ILightboxUtils
	): IWindowScrollAPI => {
		let animationFrameId: number | null = null

		if (isSSR(window)) {
			return {
				scrollToComponent: () => Promise.resolve(),
				animatedScrollTo: () => Promise.resolve(ScrollAnimationResult.Aborted),
				scrollToSelector: () => Promise.resolve(),
				scrollTo: () => Promise.resolve(),
			}
		}

		// Returns the current HTMLElement matching the selector, or null if not found.
		// This function is essential in the window scroll flow because async operations (such as awaits) can cause DOM re-renders or updates,
		// making previously-retrieved element references stale or detached. Always use this function to re-query the DOM for the latest element
		// before performing operations, especially after awaits. This helps prevent flakiness due to stale references.
		const getTargetElement = (selector: string): HTMLElement | null => {
			return domSelectors.querySelector(selector, window.document) as HTMLElement | null
		}

		const getFocusableElement = (
			selector: string,
			isExperimentOpen: boolean,
			isFirstPage: boolean
		): HTMLElement | null => {
			if (isExperimentOpen) {
				if (selector === '#SCROLL_TO_TOP' && !isFirstPage) {
					return window.document.querySelector('main section') as HTMLElement | null
				} else {
					return domSelectors.querySelector(selector, window.document) as HTMLElement | null
				}
			}
			return domSelectors.querySelector(selector, window.document) as HTMLElement | null
		}

		const getWixAdsHeight = () => {
			const wixAdsElement = domSelectors.getByCompId('WIX_ADS')
			return wixAdsElement ? wixAdsElement.offsetHeight : 0
		}

		const getHeaderOffset = (distanceBetweenCompTopToBodyTop: number, wixAdsHeight: number) => {
			const headerElement = getHeaderElement(headerContainerComponentId, window)
			if (!headerElement) {
				return 0
			}

			const headerPosition = getPosition(headerElement)

			const isHeaderStickyOrFixed = headerPosition === 'fixed' || headerPosition === 'sticky'

			const headerHeight = headerElement.getBoundingClientRect().height
			// This is potential scroll amount
			const distanceBetweenHeaderBottomAndCompTop = Math.abs(
				distanceBetweenCompTopToBodyTop - headerHeight - wixAdsHeight
			)
			const isDistanceSmallerThanHeaderHeight = distanceBetweenHeaderBottomAndCompTop < headerHeight

			// animation is triggered when scroll position equals to header height, therefore as long as the distance between
			// header bottom and compTop is less than or equals to headerHeight, the header appears on the screen,
			// and it's height should be taken into account

			return isHeaderStickyOrFixed && (!isHeaderAnimated || isDistanceSmallerThanHeaderHeight) ? headerHeight : 0
		}

		const getAnimationFrameClientYForScroll = (compId: string, openLightboxId: string | undefined) => {
			return new Promise<number>((resolve) => {
				window.requestAnimationFrame(() => {
					const compNode = getTargetElement(compId)
					if (!compNode) {
						resolve(0)
						return
					}
					resolve(getCompClientYForScroll(compNode, openLightboxId))
				})
			})
		}
		const getCompClientYForScroll = (compNode: HTMLElement, openLightboxId: string | undefined) => {
			const openLightboxElement = openLightboxId && domSelectors.getByCompId(openLightboxId, window.document)
			let bodyTop = openLightboxElement
				? openLightboxElement.getBoundingClientRect().top
				: window.document.body.getBoundingClientRect().top

			const isScrollBlocked = siteScrollBlockerApi.isScrollingBlocked()
			if (isScrollBlocked) {
				const siteContainerElement = window.document.getElementById('SITE_CONTAINER')
				bodyTop = siteContainerElement ? pxToNumber(window.getComputedStyle(siteContainerElement).marginTop) : 0
			}

			const wixAdsHeight = getWixAdsHeight()

			const compTop = compNode.getBoundingClientRect().top
			const distanceBetweenCompTopToBodyTop = compTop - bodyTop
			const headerOffset = getHeaderOffset(distanceBetweenCompTopToBodyTop, wixAdsHeight)

			return distanceBetweenCompTopToBodyTop - wixAdsHeight - (openLightboxId ? 0 : headerOffset)
		}

		// Create the AnimatedScrollManager instance
		const animatedScrollManager = new AnimatedScrollManager(
			window,
			viewMode,
			reducedMotion,
			() => getScrollableElement(popupUtils),
			getTopLocation,
			addScrollInteractionEventListeners,
			getCompClientYForScroll,
			removeScrollInteractionEventListeners
		)

		const animatedScrollTo = async (
			targetY: number,
			callbacks: ScrollToCallbacks = {},
			targetSetterCallback?: (setTargetYCallback: (newTargetY: number) => void) => void
		): Promise<ScrollAnimationResult> => {
			return animatedScrollManager.scrollTo(targetY, callbacks, targetSetterCallback)
		}

		const scrollToSelector = async (
			selector: string,
			openLightboxId?: string,
			{ callbacks = {}, skipScrollAnimation = false } = {},
			numOfRetries: number = 5
		) => {
			await readyForScrollPromise
			const readyForScrollTargetElement = getTargetElement(selector)
			if (!readyForScrollTargetElement || (isElementOrAncestorFixed(readyForScrollTargetElement) && !openLightboxId)) {
				return
			}
			const compClientYForScroll = await getAnimationFrameClientYForScroll(selector, openLightboxId)

			if (skipScrollAnimation) {
				window.scrollTo({ top: 0 })
			} else {
				let targetSetter: (newY: number) => void
				let stopObserving: (() => void) | undefined
				const observedElement = getTargetElement(selector)
				if (!observedElement) {
					return
				}
				stopObserving = animatedScrollManager.observeElementYPosition(
					observedElement,
					openLightboxId!,
					compClientYForScroll,
					(newY: number, prevY: number) => {
						if (newY !== prevY) {
							if (targetSetter) {
								targetSetter(newY)
							}
						}
					}
				)

				const result = await animatedScrollTo(compClientYForScroll, callbacks, async (newTargetSetterFunc) => {
					targetSetter = newTargetSetterFunc
				})

				if (result !== ScrollAnimationResult.Aborted) {
					const compClientYForScrollAfterScroll = await getAnimationFrameClientYForScroll(selector, openLightboxId)

					const afterScrollElement = getTargetElement(selector)
					if (!afterScrollElement) {
						stopObserving?.()
						return
					}
					const retryThreshold = 0.5
					const compYDelta = Math.abs(compClientYForScroll - compClientYForScrollAfterScroll)
					const shouldRetryScroll =
						!isStickyElement(afterScrollElement) && compYDelta > retryThreshold && numOfRetries > 0

					if (shouldRetryScroll) {
						// if the anchor original position changed due to dynamic
						// content above it height change pushing anchor down
						// we need to perform scroll logic again until reaching the anchor
						void scrollToSelector(
							selector,
							openLightboxId,
							{
								callbacks,
								skipScrollAnimation,
							},
							compYDelta > 100 ? numOfRetries : numOfRetries - 1
						)
					}
				}

				stopObserving?.()
			}
			const isExperimentOpen: boolean = !!experiments['specs.thunderbolt.postTransitionElementFocus']
			const setAttributeTargetElement = getFocusableElement(
				selector,
				isExperimentOpen,
				navigationManager.isFirstNavigation()
			)
			if (!setAttributeTargetElement) {
				return
			}

			if (!isElementTabbable(setAttributeTargetElement)) {
				setAttributeTargetElement.setAttribute('tabIndex', '-1')
				setAttributeTargetElement.setAttribute('aria-label', 'main content')
			}
			setAttributeTargetElement.focus({ preventScroll: true })
		}

		const scrollToComponent = async (targetCompId: string, { callbacks = {}, skipScrollAnimation = false } = {}) => {
			const targetCompData = structureApi.get(targetCompId)
			const openLightboxId = popupUtils?.getCurrentLightboxId()
			const isCompOnLightbox = targetCompData?.pageId === openLightboxId
			const stickyParentId = getStickyParentId(targetCompId, domSelectors)

			await scrollToSelector(`#${stickyParentId ?? targetCompId}`, isCompOnLightbox ? openLightboxId : undefined, {
				callbacks,
				skipScrollAnimation,
			})
		}

		function addScrollInteractionEventListeners(handler: () => void) {
			window.addEventListener('touchmove', handler, { passive: true })
			window.addEventListener('wheel', handler, { passive: true })
		}

		function removeScrollInteractionEventListeners(handler: () => void) {
			window.removeEventListener('touchmove', handler)
			window.removeEventListener('wheel', handler)
		}

		const scrollTo = async (
			x: number,
			y: number,
			numOfRetries: number = 5,
			startTime: number = performance.now()
		): Promise<void> => {
			await readyForScrollPromise

			window.scrollTo(x, y)

			// Check actual position after animation frame and retry if needed
			const actualY = await new Promise<number>((resolve) => {
				window.requestAnimationFrame(() => {
					resolve(window.scrollY)
				})
			})

			const retryThreshold = 0.5
			const yDelta = Math.abs(y - actualY)
			const maxRetryDuration = 1500
			const elapsedTime = performance.now() - startTime
			const shouldRetry = yDelta > retryThreshold && elapsedTime < maxRetryDuration

			if (shouldRetry) {
				// Retry until destination is reached or 1500ms elapsed
				await scrollTo(x, y, yDelta > 100 ? numOfRetries : numOfRetries - 1, startTime)
			}
		}

		return {
			animatedScrollTo,
			scrollTo,
			scrollToComponent,
			scrollToSelector,
		}
	}
)
