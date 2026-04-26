import _ from 'lodash'
import { withDependencies, optional } from '@wix/thunderbolt-ioc'
import { createPromise } from '@wix/thunderbolt-commons'
import type { INavigationManager, NavigationStartListener } from '@wix/thunderbolt-symbols'
import { isViewerFragmentSymbol, ExperimentsSymbol } from '@wix/thunderbolt-symbols'

export const NavigationManager = withDependencies(
	[ExperimentsSymbol, optional(isViewerFragmentSymbol)],
	(experiments, isViewerFragment: boolean): INavigationManager => {
		let isDuringNavigation = false
		let _shouldBlockRender = false
		let isFirstPage = true
		let isFirstNavigation = experiments['specs.thunderbolt.miniSites_runPlatformOnPage'] ? true : !isViewerFragment
		let navigationEndResolvers: Array<() => void> = []
		let continueNavigationResolvers: Array<(isLast: boolean) => void> = []
		let dataFetchingResolvers: Array<() => void> = []
		let isDataFetching = false
		let navigationStartListeners: Array<NavigationStartListener> = []
		// calculate last navigation timings for INP bi event
		const lastNavigationTimings: {
			start: number | null
			end: number | null
		} = {
			start: null,
			end: null,
		}
		function updateStartNavigationTimings() {
			if (!performance || !performance.now) {
				return
			}
			lastNavigationTimings.start = performance.now()
		}
		function updateEndNavigationTimings() {
			if (!performance || !performance.now) {
				return
			}
			lastNavigationTimings.end = performance.now()
		}
		return {
			getLastNavigationTimings: () => lastNavigationTimings,
			endNavigation: () => {
				updateEndNavigationTimings()
				isDuringNavigation = false
				isFirstNavigation = false
				continueNavigationResolvers.forEach((resolver, idx) => resolver(idx === continueNavigationResolvers.length - 1))
				continueNavigationResolvers = []
				navigationEndResolvers.forEach((resolver) => resolver())
				navigationEndResolvers = []
			},
			setShouldBlockRender: (shouldBlockRender: boolean) => {
				_shouldBlockRender = shouldBlockRender
			},
			isDuringNavigation: () => isDuringNavigation,
			shouldBlockRender: () => _shouldBlockRender,
			isFirstNavigation: () => isFirstNavigation,
			isFirstPage: () => isFirstPage,
			startNavigation: (isLightbox: boolean = false) => {
				updateStartNavigationTimings()
				isDuringNavigation = true

				if (!isFirstNavigation && !isLightbox) {
					isFirstPage = false
				}
				navigationStartListeners.forEach((listener) => listener())
			},
			waitForShouldContinueNavigation: () => {
				// don't use this api - should be used only in router.ts, if you need to wait for navigation end use waitForNavigationEnd
				const { resolver, promise } = createPromise<boolean>()
				continueNavigationResolvers.push(resolver)
				return promise
			},
			waitForNavigationEnd: () => {
				const { resolver, promise } = createPromise()
				navigationEndResolvers.push(resolver)
				return promise
			},
			startDataFetching: () => {
				isDataFetching = true
			},
			endDataFetching: () => {
				isDataFetching = false
				dataFetchingResolvers.forEach((resolver) => resolver())
				dataFetchingResolvers = []
			},
			isDuringDataFetching: () => isDataFetching,
			waitForDataFetching: () => {
				const { resolver, promise } = createPromise()
				dataFetchingResolvers.push(resolver)
				return promise
			},
			registerToNavigationStart: (listener: () => void) => {
				navigationStartListeners.push(listener)
				return () => {
					navigationStartListeners = _.without(navigationStartListeners, listener)
				}
			},
		}
	}
)
