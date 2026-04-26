import fastdom from 'fastdom'
import type { ISiteScrollBlockerServiceConfig } from '@wix/viewer-service-site-scroll-blocker/definition'
import type { ISiteScrollBlocker } from '@wix/viewer-service-site-scroll-blocker/types'
import type { Experiments } from '@wix/thunderbolt-symbols'

type ISiteScrollBlockerServiceConfigThunderbolt = ISiteScrollBlockerServiceConfig & { experiments: Experiments }

const MENU_AS_CONTAINER_BLOCKER = 'MENU_AS_CONTAINER'

export const createSiteScrollBlocker = (
	{ onSiteScrollBlockChanged, shouldBlockScrollWithoutVar, experiments }: ISiteScrollBlockerServiceConfigThunderbolt = {
		experiments: {},
	}
): ISiteScrollBlocker => {
	const window = globalThis.window
	const isSSR = () => !window

	const shouldFixIosFlashBug = experiments?.['specs.thunderbolt.shouldFixIosFlashBug']

	let lastBlockListenerId = 0
	const blockListeners = new Map<unknown, any>()

	const blockSiteScrollingClassName = shouldBlockScrollWithoutVar ? 'siteScrollingBlocked' : 'blockSiteScrolling'
	let _activeBlockClassName: string = blockSiteScrollingClassName

	let blockers: Array<string> = []
	let _scrollCorrection = 0
	let siteContainerOriginMarginTop: string | undefined
	let _isIOSTouchScrollBlocked = false
	let removePreventOutsideMenuTouchScrollListener: (() => void) | null = null

	const isNewIsScrollBlockedCondition = experiments['specs.thunderbolt.newIsScrollBlockedCondition']
	let internalIsScrollBlocked = false

	const isScrollingBlocked = () => blockers.length > 0

	const restoreScrollPosition = () => {
		window!.scrollTo(0, _scrollCorrection)
	}

	const getSiteElements = () => ({
		bodyElement: document.body as HTMLBodyElement,
		siteContainerElement: document.getElementById('SITE_CONTAINER'),
		menuInlineContentParentElement: document.getElementById('inlineContentParent-MENU_AS_CONTAINER'),
	})

	const setMarginTop = (element: HTMLElement, marginTop: string = '') => {
		element.style && (element.style.marginTop = marginTop)
	}

	const setOverscrollBehaviorYContain = (element: HTMLElement | null) => {
		if (!element) return

		element.style.overscrollBehaviorY = 'contain'
	}

	const removeOverscrollBehaviorY = (element: HTMLElement | null) => {
		if (!element) return

		element.style.removeProperty('overscroll-behavior-y')
	}

	const addPreventOutsideMenuTouchScrollListener = () => {
		const menuInlineContentParentElement = document.getElementById('inlineContentParent-MENU_AS_CONTAINER')
		if (!menuInlineContentParentElement || removePreventOutsideMenuTouchScrollListener) {
			return
		}

		const preventOutsideMenuTouchScroll = (e: TouchEvent) => {
			const target = e.target as Element | null
			const popupsRoot = document.getElementById('POPUPS_ROOT')

			const isInsideMenu = menuInlineContentParentElement.contains(target)
			const isInsidePopup = popupsRoot?.contains(target)
			const shouldAllowScroll = isInsideMenu || isInsidePopup
			if (shouldAllowScroll) {
				return
			}

			e.preventDefault()
		}

		document.addEventListener('touchmove', preventOutsideMenuTouchScroll, { passive: false })

		removePreventOutsideMenuTouchScrollListener = () => {
			document.removeEventListener('touchmove', preventOutsideMenuTouchScroll)
			removePreventOutsideMenuTouchScrollListener = null
		}
	}

	const removePreventOutsideMenuTouchScrollListenerIfExists = () => {
		removePreventOutsideMenuTouchScrollListener?.()
	}

	const blockSiteScrolling = (blocker: string) => {
		const { bodyElement, siteContainerElement, menuInlineContentParentElement } = getSiteElements()

		fastdom.measure(() => {
			// New condition relies on internal state, old condition relies on DOM check (problematic in specific cases of multiple calls batched by `fastdom`)
			const isAlreadyBlocked = isNewIsScrollBlockedCondition
				? internalIsScrollBlocked
				: bodyElement.classList.contains(_activeBlockClassName)
			// The site should be blocked only when it's not already blocked
			if (!isAlreadyBlocked) {
				internalIsScrollBlocked = true
				_scrollCorrection = window!.scrollY
				fastdom.mutate(() => {
					if (shouldBlockScrollWithoutVar) {
						const isMenuOpen = blockers.includes(MENU_AS_CONTAINER_BLOCKER)
						const shouldBlockIOSTouchScroll = shouldFixIosFlashBug && isMenuOpen
						if (shouldBlockIOSTouchScroll) {
							_isIOSTouchScrollBlocked = true
							_activeBlockClassName = 'siteScrollingBlockedIOSFix'
							setOverscrollBehaviorYContain(menuInlineContentParentElement)
							addPreventOutsideMenuTouchScrollListener()
						} else {
							_activeBlockClassName = blockSiteScrollingClassName
							const marginTop = `calc(${Math.max(0.5, _scrollCorrection)}px)`
							siteContainerOriginMarginTop = siteContainerElement?.style?.marginTop
							siteContainerElement && setMarginTop(siteContainerElement, `calc(${marginTop}*-1)`)
						}
					} else {
						_activeBlockClassName = blockSiteScrollingClassName
						bodyElement.style.setProperty('--blocked-site-scroll-margin-top', `${Math.max(0.5, _scrollCorrection)}px`)
						removePreventOutsideMenuTouchScrollListenerIfExists()
					}

					bodyElement.classList.add(_activeBlockClassName)
				})
			}
		})

		blockListeners.forEach(({ handleBlockedBy }) => handleBlockedBy && handleBlockedBy(blocker))
	}

	const unblockSiteScrolling = (blocker: string) => {
		const { bodyElement, siteContainerElement, menuInlineContentParentElement } = getSiteElements()

		internalIsScrollBlocked = false
		fastdom.mutate(() => {
			bodyElement.classList.remove(_activeBlockClassName)

			if (shouldBlockScrollWithoutVar) {
				if (_isIOSTouchScrollBlocked) {
					_isIOSTouchScrollBlocked = false
					removeOverscrollBehaviorY(menuInlineContentParentElement)
					removePreventOutsideMenuTouchScrollListenerIfExists()
				} else {
					siteContainerElement && setMarginTop(siteContainerElement, siteContainerOriginMarginTop)
				}
			} else {
				bodyElement.style.removeProperty('--blocked-site-scroll-margin-top')
				removePreventOutsideMenuTouchScrollListenerIfExists()
			}

			restoreScrollPosition()
		})

		blockListeners.forEach(({ handleUnblockedBy }) => handleUnblockedBy && handleUnblockedBy(blocker))
	}

	const addBlocker = (blocker: string) => {
		blockers = !blockers.includes(blocker) ? [...blockers, blocker] : blockers
		onSiteScrollBlockChanged && onSiteScrollBlockChanged(isScrollingBlocked())

		// The site should be blocked only when there's one blocker,
		// otherwise it's already blocked (more than one) or doesn't need to be blocked (zero)
		const shouldBlock = blockers.length === 1

		if (shouldBlock) {
			blockSiteScrolling(blocker)
		}
	}

	const removeBlocker = (blocker: string) => {
		const [activeBlocker] = blockers
		blockers = blockers.filter((b) => b !== blocker)
		const [newActiveBlocker] = blockers

		onSiteScrollBlockChanged && onSiteScrollBlockChanged(isScrollingBlocked())

		// The active blocker changes if we remove the blockers not from the end to start.
		// For example, removing from start to end, the active blocker should be adjusted each time (because the first blocker changes)
		const hasActiveBlockerChanged = activeBlocker !== newActiveBlocker

		if (hasActiveBlockerChanged) {
			if (newActiveBlocker) {
				blockSiteScrolling(blocker)
			} else {
				unblockSiteScrolling(blocker)
			}
		}
	}

	const setSiteScrollingBlocked = (blocked: boolean, compId: string) => {
		if (isSSR()) {
			return
		}

		return blocked ? addBlocker(compId) : removeBlocker(compId)
	}

	return {
		setSiteScrollingBlocked,
		registerScrollBlockedListener(listener) {
			const listenerId = ++lastBlockListenerId
			blockListeners.set(listenerId, listener)
			return listenerId
		},
		unRegisterScrollBlockedListener(listenerId) {
			blockListeners.delete(listenerId)
		},
		isScrollingBlocked,
	}
}
