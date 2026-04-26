import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	IAppWillLoadPageHandler,
	IComponentsStylesOverrides,
	ICompsLifeCycle,
	IDomSelectors,
} from '@wix/thunderbolt-symbols'
import { ComponentsStylesOverridesSymbol, CompsLifeCycleSym, DomSelectorsSymbol } from '@wix/thunderbolt-symbols'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'
import { querySelectorAll } from '@wix/thunderbolt-dom-utils'
import _ from 'lodash'

export type PlatformViewPortAPI = {
	onViewportEnter(compId: string, cb: Function): void
	onViewportLeave(compId: string, cb: Function): void
} & IAppWillLoadPageHandler

const getCallbackUniqueId = (callbackUniqueId: string, displayedId: string) => `${callbackUniqueId}_${displayedId}`

export const platformViewportAPI = withDependencies(
	[
		ComponentsStylesOverridesSymbol,
		CompsLifeCycleSym,
		NavigationManagerSymbol,
		DomSelectorsSymbol,
		optional(LightboxUtilsSymbol),
	],
	(
		componentsStylesOverrides: IComponentsStylesOverrides,
		compsLifeCycle: ICompsLifeCycle,
		navigationManager: INavigationManager,
		domSelectors: IDomSelectors,
		popupUtils?: ILightboxUtils
	): PlatformViewPortAPI => {
		const intersectionObservers: Array<IntersectionObserver> = []
		const compLifeCycleCallbacks: Array<() => void> = []
		const viewportCallbackIds: Set<string> = new Set()
		let options: object

		const getIntersectionObserverOptions = () => {
			if (process.env.browser) {
				const wixAds = domSelectors.getByCompId('WIX_ADS')

				if (wixAds) {
					return { rootMargin: `-${wixAds.offsetHeight}px 0px 0px 0px` }
				}
			}
			return {}
		}

		const getAllTargets = (compId: string) => {
			return querySelectorAll(`#${compId}, [id^="${compId}__"]`)
		}
		const getTargets = async (compId: string) => {
			if (navigationManager.isDuringNavigation()) {
				await navigationManager.waitForNavigationEnd()
			}
			const targets = getAllTargets(compId)
			if (targets.length) {
				return targets
			}
			return compsLifeCycle.waitForComponentToRender(compId)
		}

		function registerViewportEnter({
			target,
			cb,
			displayedId,
			callbackUniqueId,
		}: {
			target: Element
			cb: Function
			displayedId: string
			callbackUniqueId: string
		}) {
			if (viewportCallbackIds.has(callbackUniqueId)) {
				return
			}

			options = options || getIntersectionObserverOptions()
			const onViewportEnterHandler = (entries: Array<IntersectionObserverEntry>) => {
				entries
					.filter((intersectionEntry) => intersectionEntry.target.id === displayedId)
					.forEach((intersectionEntry) => {
						const isIntersecting = intersectionEntry.isIntersecting
						const isHidden = componentsStylesOverrides.isHidden(displayedId)
						if (isIntersecting && !isHidden) {
							cb([{ type: 'viewportEnter', compId: displayedId }])
						}
					})
			}
			const intersectionObserver = new window.IntersectionObserver(onViewportEnterHandler, options)
			intersectionObservers.push(intersectionObserver)
			intersectionObserver.observe(target as HTMLElement)
			viewportCallbackIds.add(callbackUniqueId)
		}

		function registerViewportLeave({
			target,
			cb,
			displayedId,
			callbackUniqueId,
		}: {
			target: Element
			cb: Function
			displayedId: string
			callbackUniqueId: string
		}) {
			if (viewportCallbackIds.has(callbackUniqueId)) {
				return
			}

			options = options || getIntersectionObserverOptions()
			let isFirstCall = true
			const onViewportLeaveHandler = (entries: Array<IntersectionObserverEntry>) => {
				entries
					.filter((intersectionEntry) => intersectionEntry.target.id === displayedId)
					.forEach((intersectionEntry) => {
						const isIntersecting = intersectionEntry.isIntersecting
						const isHidden = componentsStylesOverrides.isHidden(displayedId)
						if (!isIntersecting && !isHidden && !isFirstCall) {
							cb([{ type: 'viewportLeave', compId: displayedId }])
						}
						isFirstCall = false
					})
			}
			const intersectionObserver = new window.IntersectionObserver(onViewportLeaveHandler, options)
			intersectionObservers.push(intersectionObserver)
			intersectionObserver.observe(target as HTMLElement)
			viewportCallbackIds.add(callbackUniqueId)
		}

		async function onViewportEnter(compId: string, cb: Function) {
			if (process.env.browser) {
				const targets = await getTargets(compId)
				const callbackUniqueId = _.uniqueId('onViewportEnter_')
				targets.forEach((target) =>
					registerViewportEnter({
						target,
						cb,
						displayedId: target.id,
						callbackUniqueId: getCallbackUniqueId(callbackUniqueId, target.id),
					})
				)
				const unregisterFromCompLifeCycle = compsLifeCycle.registerToCompLifeCycle(
					[compId],
					callbackUniqueId,
					(__, displayedId, element) => {
						registerViewportEnter({
							target: element,
							cb,
							displayedId,
							callbackUniqueId: getCallbackUniqueId(callbackUniqueId, displayedId),
						})
					}
				)
				compLifeCycleCallbacks.push(unregisterFromCompLifeCycle)
			}
		}

		async function onViewportLeave(compId: string, cb: Function) {
			if (process.env.browser) {
				const targets = await getTargets(compId)
				const callbackUniqueId = _.uniqueId('onViewportLeave_')
				targets.forEach((target) =>
					registerViewportLeave({
						target,
						cb,
						displayedId: target.id,
						callbackUniqueId: getCallbackUniqueId(callbackUniqueId, target.id),
					})
				)
				const unregisterFromCompLifeCycle = compsLifeCycle.registerToCompLifeCycle(
					[compId],
					callbackUniqueId,
					(__, displayedId, element) => {
						registerViewportLeave({
							target: element,
							cb,
							displayedId,
							callbackUniqueId: getCallbackUniqueId(callbackUniqueId, displayedId),
						})
					}
				)
				compLifeCycleCallbacks.push(unregisterFromCompLifeCycle)
			}
		}

		const appWillLoadPage: IAppWillLoadPageHandler['appWillLoadPage'] = ({ pageId }) => {
			// TODO what about popups? if i open the same popup couple times i'll have duplicate observers no? consider binding to the page container.
			if (!popupUtils?.isLightbox(pageId)) {
				compLifeCycleCallbacks.forEach((compUnregisterFunction) => compUnregisterFunction())
				compLifeCycleCallbacks.length = 0
				intersectionObservers.forEach((intersectionObserver) => intersectionObserver.disconnect())
				intersectionObservers.length = 0
			}
		}

		return {
			name: 'viewportHandlers',
			onViewportEnter,
			onViewportLeave,
			appWillLoadPage,
		}
	}
)
