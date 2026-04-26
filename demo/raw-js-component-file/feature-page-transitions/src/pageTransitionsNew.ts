import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { IPropsStore, Experiments, INavigationManager } from '@wix/thunderbolt-symbols'
import {
	FeatureStateSymbol,
	Props,
	PageTransitionsCompletedSymbol,
	ExperimentsSymbol,
	NavigationManagerSymbol,
} from '@wix/thunderbolt-symbols'
import type { PageTransitionsPageState } from './types'
import { name } from './symbols'
import type { ComponentWillMount, ViewerComponent } from 'feature-components'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { IPageTransitionsCompleted } from './IPageTransitionsCompleted'
import type { IScrollRestorationAPI } from 'feature-scroll-restoration'
import { ScrollRestorationAPISymbol } from 'feature-scroll-restoration'

export const PageComponentTransitionsWillMount = withDependencies(
	[
		Props,
		PageTransitionsCompletedSymbol,
		ScrollRestorationAPISymbol,
		named(FeatureStateSymbol, name),
		ExperimentsSymbol,
		NavigationManagerSymbol,
	],
	(
		propsStore: IPropsStore,
		pageTransitionsCompleted: IPageTransitionsCompleted,
		scrollRestorationAPI: IScrollRestorationAPI,
		featureState: IFeatureState<PageTransitionsPageState>,
		experiments: Experiments,
		navigationManager: INavigationManager
	): ComponentWillMount<ViewerComponent> => {
		return {
			componentTypes: ['Page'],
			componentWillMount(pageComponent) {
				const state = featureState.get()
				const transitionEnabled = state ? state.nextTransitionEnabled : true
				const isFirstMount = state ? state.isFirstMount : true

				const pageId = pageComponent.id

				propsStore.update({
					SITE_PAGES: {
						transitionEnabled,
						onTransitionStarting: () => {
							if (!scrollRestorationAPI.getScrollYHistoryState()) {
								scrollRestorationAPI.scrollToTop(
									experiments['specs.thunderbolt.pageTransitionScrollSmoothly'] ? 'smooth' : undefined
								)
							}
							if (experiments['specs.thunderbolt.postTransitionElementFocus']) {
								if (navigationManager.isFirstPage()) {
									const targetElement = window!.document.getElementById('SCROLL_TO_TOP')
									targetElement?.focus()
								} else {
									const firstSection = window.document.querySelector('main section') as HTMLElement
									firstSection?.focus({ preventScroll: true })
								}
							}
						},
						onTransitionComplete: () => {
							pageTransitionsCompleted.notifyPageTransitionsCompleted(pageId)
							if (scrollRestorationAPI.getScrollYHistoryState()) {
								scrollRestorationAPI.restoreScrollPosition()
							}
						},
					},
				})

				featureState.update(() => ({
					...state,
					isFirstMount,
					nextTransitionEnabled: true,
				}))
			},
		}
	}
)
