import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { IHeadContent } from '@wix/thunderbolt-symbols'
import {
	FeatureStateSymbol,
	HeadContentSymbol,
	PageFeatureConfigSymbol,
	PageTransitionsCompletedSymbol,
} from '@wix/thunderbolt-symbols'
import type { PageTransitionsDidMountFactory } from './types'
import { name } from './symbols'

const pageTransitionsDidMountFactory: PageTransitionsDidMountFactory = (
	pageConfig,
	featureState,
	pageTransitionsCompleted,
	headContent: IHeadContent
) => {
	const useCssFeature = pageConfig.useCssFeatureForViewTransitions

	return {
		name: 'pageTransitions',
		pageWillMount() {
			if (!useCssFeature) {
				const viewTransitionsStyle = `<style id="page-transitions">@view-transition {navigation: auto;types: ${pageConfig.transitionName}}</style>`
				headContent.setHead(viewTransitionsStyle)
			}
		},
		pageDidMount(pageId) {
			const state = featureState.get()

			if (state?.isFirstMount ?? true) {
				pageTransitionsCompleted.notifyPageTransitionsCompleted(pageId)
			}

			featureState.update((current) => ({
				...current,
				isFirstMount: false,
			}))
		},
		pageWillUnmount({ contextId }) {
			const state = featureState.get()

			// release propStore subscription
			state?.propsUpdateListenersUnsubscribers?.[contextId]?.()
			featureState.update((currentState) => {
				const propsUpdateListenersUnsubscribers = currentState?.propsUpdateListenersUnsubscribers ?? {}
				delete propsUpdateListenersUnsubscribers[contextId]
				return {
					...currentState,
					propsUpdateListenersUnsubscribers,
				}
			})
		},
	}
}

export const PageTransitionsDidMount = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		named(FeatureStateSymbol, name),
		PageTransitionsCompletedSymbol,
		HeadContentSymbol,
	],
	pageTransitionsDidMountFactory
)
