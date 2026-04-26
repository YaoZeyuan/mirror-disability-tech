import type { IPageTransitionsCompleted } from './IPageTransitionsCompleted'
import type { pageTransitionsCompletedListener, PageTransitionsPageConfig } from './types'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { PageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { name } from './symbols'

const pageTransitionsCompleted = (pageConfig: PageTransitionsPageConfig): IPageTransitionsCompleted => {
	let listeners: Array<pageTransitionsCompletedListener> = []

	return {
		hasTransition: pageConfig.transitionName !== 'none',
		onPageTransitionsCompleted: (listener: pageTransitionsCompletedListener) => {
			listeners.push(listener)
		},

		notifyPageTransitionsCompleted: (pageId: string) => {
			listeners.forEach((listener) => listener(pageId))
			listeners = []
		},
	}
}

export const PageTransitionsCompleted = withDependencies(
	[named(PageFeatureConfigSymbol, name)],
	pageTransitionsCompleted
)
