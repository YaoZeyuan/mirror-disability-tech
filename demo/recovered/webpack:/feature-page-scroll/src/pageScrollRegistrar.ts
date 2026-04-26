import type { IFeatureState } from 'thunderbolt-feature-state'
import type { IPageScrollRegistrar, IScrollRegistrarState, ScrollHandler, ScrollPosition } from './types'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, IPageDidMountHandler, IPageDidUnmountHandler } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, FeatureStateSymbol } from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import { name } from './symbols'
import _ from 'lodash'
import type { ILightbox } from 'feature-lightbox'
import { LightboxSymbol } from 'feature-lightbox'

export const PageScroll = withDependencies(
	[named(FeatureStateSymbol, name), BrowserWindowSymbol, DomSelectorsSymbol, optional(LightboxSymbol)],
	(
		featureState: IFeatureState<IScrollRegistrarState>,
		window: BrowserWindow,
		domSelectors: IDomSelectors,
		popupsApi?: ILightbox
	): IPageScrollRegistrar & IPageDidMountHandler & IPageDidUnmountHandler => {
		const registeredScrollHandlers: Array<EventListener> = []
		const registeredThrottledScrollHandlers: Array<ScrollHandler> = []

		const invokeThrottledScrollHandlers = _.throttle(
			(scrollPosition: ScrollPosition, handlers: Array<ScrollHandler>) => {
				handlers.forEach((handler) => handler(scrollPosition))
			},
			100
		)

		const invokeThrottledScrollEvent = (e: Event, handlers: Array<ScrollHandler>) => {
			const target = e.currentTarget // element with event listener (popup root / window)
			const position = {
				x: (target as Window).pageXOffset ?? (target as HTMLElement).scrollLeft,
				y: (target as Window).pageYOffset ?? (target as HTMLElement).scrollTop,
			}
			invokeThrottledScrollHandlers(position, handlers)
		}

		const propagateScrollEvent = (e: Event) => {
			if (registeredThrottledScrollHandlers.length > 0) {
				invokeThrottledScrollEvent(e, registeredThrottledScrollHandlers)
			}
			registeredScrollHandlers.forEach((listener) => listener(e))
		}

		const getScrolledContainerElement = (compId: string) => {
			const getScrolledContainerElementRecursive = (element: HTMLElement | null): HTMLElement | null => {
				if (!element || element.id === 'SITE_CONTAINER') {
					return null
				}

				if (window!.getComputedStyle(element).overflowY === 'scroll') {
					return element
				}

				return getScrolledContainerElementRecursive(element.parentElement)
			}

			const compElement = domSelectors.getByCompId(compId, window!.document)
			return getScrolledContainerElementRecursive(compElement)
		}

		return {
			registerToThrottledScroll(handler: ScrollHandler, compId) {
				if (compId) {
					const scrolledContainerElement = getScrolledContainerElement(compId)
					const listener = (e: Event) => invokeThrottledScrollEvent(e, [handler])

					// we can't remove listeners in pageDidMount because the elements already unmounted
					if (scrolledContainerElement) {
						scrolledContainerElement.addEventListener('scroll', listener)
					} else {
						registeredThrottledScrollHandlers.push(handler)
					}
				} else {
					registeredThrottledScrollHandlers.push(handler)
				}
			},
			registerToScroll(handler: EventListener) {
				registeredScrollHandlers.push(handler)
			},
			async pageDidUnmount() {
				window && window.removeEventListener('scroll', propagateScrollEvent)
			},
			async pageDidMount(pageId: string) {
				if (popupsApi && popupsApi.isLightbox(pageId)) {
					popupsApi.registerToLightboxEvent('popupScroll', propagateScrollEvent)
				} else {
					window && window.addEventListener('scroll', propagateScrollEvent)
				}
			},
		}
	}
)
