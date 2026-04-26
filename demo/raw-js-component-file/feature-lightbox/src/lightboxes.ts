import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IPageWillUnmountHandler,
	ICyclicTabbing,
	Experiments,
	IFetchApi,
	IStructureAPI,
	IPageInitializer,
	IPageProvider,
} from '@wix/thunderbolt-symbols'
import {
	LifeCycle,
	BrowserWindowSymbol,
	FeatureStateSymbol,
	MasterPageFeatureConfigSymbol,
	CurrentRouteInfoSymbol,
	SiteFeatureConfigSymbol,
	ExperimentsSymbol,
	Fetch,
	StructureAPI,
	PageInitializerSymbol,
	PageProviderSymbol,
} from '@wix/thunderbolt-symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { isSSR } from '@wix/thunderbolt-commons'
import { CyclicTabbingSymbol } from 'feature-cyclic-tabbing'
import type {
	ILightbox,
	LightboxFeatureState,
	LightboxesMasterPageConfig,
	LightboxEvent,
	LightboxEventListener,
	ICurrentLightbox,
	ILightboxesAPI,
	LightboxSiteConfig,
	ILightboxesResponseHandler,
	LightboxViewerContext,
} from './types'
import { name, CurrentLightboxSymbol, LightboxesAPISymbol, LightboxesResponseHandlerSymbol } from './symbols'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'
import type { ICurrentRouteInfo } from 'feature-router'
import type { RouterFetchAPI } from 'feature-router-fetch'
import { RouterFetchSymbol, RouterFetchRequestTypes } from 'feature-router-fetch'

const lightboxHandles: {
	[lightboxPageId: string]: {
		lightboxViewerContext: LightboxViewerContext
	}
} = {}

const lightboxesFactory = (
	{ initPage }: IPageInitializer,
	window: BrowserWindow,
	featureState: IFeatureState<LightboxFeatureState>,
	{ prefixToRouterFetchData, pageIdToPrefix }: LightboxSiteConfig,
	masterPageConfig: LightboxesMasterPageConfig,
	pageProvider: IPageProvider,
	navigationManager: INavigationManager,
	currentRouteInfo: ICurrentRouteInfo,
	currentLightbox: ICurrentLightbox,
	cyclicTabbing: ICyclicTabbing,
	lightboxesAPI: ILightboxesAPI,
	{ handleResponse }: ILightboxesResponseHandler,
	fetchApi: IFetchApi,
	{ getFetchParams }: RouterFetchAPI,
	experiments: Experiments,
	structureApi: IStructureAPI
): ILightbox => {
	const lightboxOpenEventListeners: Array<LightboxEventListener> = []
	const lightboxCloseEventListeners: Array<LightboxEventListener> = []
	let lightboxCloseHandler: LightboxEventListener = null
	let propagatePageScroll: LightboxEventListener
	const siteRoot = window?.document.querySelector('#site-root')

	const onKeyDown = (e: Event) => {
		const keyboardEvent = e as KeyboardEvent
		if (keyboardEvent.key === 'Escape') {
			closeLightbox()
		}
	}

	const closeLightbox = async () => {
		const lightboxId = getCurrentLightboxId() as string
		if (!lightboxId) {
			return
		}

		const { pendingLightboxId } = featureState.get() || {}
		const isOpeningLightboxFromWithinAnotherLightbox = pendingLightboxId && pendingLightboxId !== lightboxId
		const currentLightboxCloseHandler = lightboxCloseHandler

		const pageReflector = await pageProvider(lightboxId, lightboxId)
		const handlers = await pageReflector.getAllImplementersOfAsync<IPageWillUnmountHandler>(
			LifeCycle.PageWillUnmountHandler
		)
		await Promise.all(handlers.map((handler) => handler.pageWillUnmount({ pageId: lightboxId, contextId: lightboxId })))

		if (isOpeningLightboxFromWithinAnotherLightbox) {
			// Defer DOM removal so the old lightbox stays visible while the new one loads,
			// preventing a blank screen flash (especially noticeable on protected pages).
			featureState.update((state) => ({
				...state,
				lightboxPendingRemoval: lightboxId,
			}))
		} else {
			lightboxesAPI.removeLightboxFromDynamicStructure(lightboxId)
		}
		currentLightboxCloseHandler?.()
		lightboxCloseEventListeners.forEach((eventHandler) => eventHandler?.())

		if (isOpeningLightboxFromWithinAnotherLightbox) {
			return
			// prevent popup close handler from tempering site level state if we're still rendering a popup
		}

		cyclicTabbing.disableCyclicTabbing(lightboxId)
		if (experiments['specs.thunderbolt.screen_reader_focus']) {
			siteRoot?.removeAttribute('aria-hidden')
		}

		if (!isSSR(window)) {
			window.removeEventListener('keydown', onKeyDown)
		}
		const currentLightboxId = currentLightbox.isDuringReopen() ? getCurrentLightboxId() : undefined

		featureState.update((state) => ({
			...state,
			pageWillLoadHandler: null,
			currentLightboxId,
			pendingLightboxId: undefined,
			lightboxRouteData: undefined,
			lightboxPendingRemoval: undefined,
		}))
	}

	const getCurrentLightboxId = () => {
		return featureState.get() ? featureState.get().currentLightboxId : undefined
	}

	const isLightboxOpen = () => !!getCurrentLightboxId()

	const isLightboxAlreadyOpen = (lightboxId: string): boolean => {
		if (currentLightbox.isDuringReopen()) {
			return false
		}
		const state = featureState.get()
		return state?.currentLightboxId === lightboxId || state?.pendingLightboxId === lightboxId
	}

	const openLightbox: ILightbox['open'] = async (
		lightboxId,
		closeHandler,
		lightboxViewerContext,
		dynamicPageIdOverride
	) => {
		lightboxHandles[lightboxId] = {
			lightboxViewerContext,
		}
		const prefix = pageIdToPrefix[lightboxId]
		const routerFetchData = prefixToRouterFetchData[prefix]
		if (routerFetchData) {
			const { url, options } = getFetchParams(RouterFetchRequestTypes.Lightboxes, routerFetchData, {
				lightboxId,
				dynamicPageIdOverride,
			})
			const { pageId: lightboxReplacerId } = await handleResponse(fetchApi.envFetch(url, options))
			lightboxId = lightboxReplacerId ?? lightboxId
		}

		if (isLightboxAlreadyOpen(lightboxId)) {
			lightboxCloseHandler = lightboxCloseHandler || closeHandler
			return
		}
		featureState.update((state) => ({
			...state,
			pendingLightboxId: lightboxId,
		}))
		cyclicTabbing.enableCyclicTabbing(lightboxId)
		if (experiments['specs.thunderbolt.screen_reader_focus']) {
			siteRoot?.setAttribute('aria-hidden', 'true')
		}
		/*
		 custom signup popup is the only use-case where popup is opened before the underlying page navigation has ended.
		 Triggering start navigation from custom signup popup before the landing page was navigated to, messes with other flows that depend
		 on isFirstNavigation.
		 */
		const notLandingOnProtectedPage = !currentRouteInfo.isLandingOnProtectedPage()
		if (notLandingOnProtectedPage) {
			navigationManager.startNavigation(true)
			navigationManager.setShouldBlockRender(true)
		}
		const removePendingLightbox = () => {
			const { lightboxPendingRemoval } = featureState.get() || {}
			if (lightboxPendingRemoval) {
				lightboxesAPI.removeLightboxFromDynamicStructure(lightboxPendingRemoval)
				featureState.update((state) => ({
					...state,
					lightboxPendingRemoval: undefined,
				}))
			}
		}

		try {
			await initPage({ pageId: lightboxId, contextId: lightboxId, isLightbox: true })
		} catch (e) {
			removePendingLightbox()
			throw e
		}

		// If the lightbox structure was not fetched during the initPages call for some reason, we should not proceed to create the POPUPS_ROOT container
		if (!structureApi.get(lightboxId)) {
			removePendingLightbox()
			notLandingOnProtectedPage && navigationManager.setShouldBlockRender(false)
			notLandingOnProtectedPage && navigationManager.endNavigation()
			return
		}
		lightboxCloseHandler = closeHandler
		if (lightboxOpenEventListeners.length > 0) {
			lightboxOpenEventListeners.forEach((eventHandler) => {
				if (eventHandler) {
					eventHandler(lightboxId)
				}
			})
		}
		if (!isSSR(window)) {
			window.addEventListener('keydown', onKeyDown)
		}
		notLandingOnProtectedPage && navigationManager.setShouldBlockRender(false)
		removePendingLightbox()
		await lightboxesAPI.addLightboxToDynamicStructure(lightboxId)
		featureState.update((state) => ({
			...state,
			pageWillLoadHandler: closeLightbox,
			currentLightboxId: lightboxId,
		}))
		notLandingOnProtectedPage && navigationManager.endNavigation()
	}

	return {
		isLightbox(pageId) {
			return masterPageConfig.popupPages[pageId]
		},
		open(lightboxId, closeHandler = null, lightboxViewerContext, dynamicPageIdOverride) {
			const pendingLightboxPromise = featureState.get()?.pendingLightboxPromise || Promise.resolve()
			const openLightboxPromise = pendingLightboxPromise.then(() =>
				openLightbox(lightboxId, closeHandler, lightboxViewerContext, dynamicPageIdOverride)
			)
			featureState.update((state) => ({ ...state, pendingLightboxPromise: openLightboxPromise }))
			return openLightboxPromise
		},
		close: closeLightbox,
		getContext(lightboxId) {
			return lightboxHandles[lightboxId]?.lightboxViewerContext
		},
		registerToLightboxEvent(eventType: LightboxEvent, eventHandler: LightboxEventListener) {
			switch (eventType) {
				case 'popupScroll':
					propagatePageScroll = eventHandler

					const popupsRoot = window!.document.getElementById('POPUPS_ROOT')
					const ResponsivePopupContainerOverflowWrapper = popupsRoot?.querySelector('div[class*="overflow-wrapper"]')
					const lightboxesRoot = masterPageConfig.isResponsive
						? ResponsivePopupContainerOverflowWrapper || popupsRoot
						: popupsRoot
					lightboxesRoot && lightboxesRoot.addEventListener('scroll', propagatePageScroll as EventListener)
					break
				case 'popupOpen':
					lightboxOpenEventListeners.push(eventHandler)
					break
				case 'popupClose':
					lightboxCloseEventListeners.push(eventHandler)
					break
				default:
					break
			}
		},
		getCurrentLightboxId,
		isOpen: isLightboxOpen,
	}
}

export const Lightboxes = withDependencies(
	[
		PageInitializerSymbol,
		BrowserWindowSymbol,
		named(FeatureStateSymbol, name),
		named(SiteFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		PageProviderSymbol,
		NavigationManagerSymbol,
		CurrentRouteInfoSymbol,
		CurrentLightboxSymbol,
		CyclicTabbingSymbol,
		LightboxesAPISymbol,
		LightboxesResponseHandlerSymbol,
		Fetch,
		RouterFetchSymbol,
		ExperimentsSymbol,
		StructureAPI,
	],
	lightboxesFactory
)
