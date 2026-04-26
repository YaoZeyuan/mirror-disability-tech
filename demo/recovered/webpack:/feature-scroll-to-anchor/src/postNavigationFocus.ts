import { withDependencies } from '@wix/thunderbolt-ioc'
import type { INavigationManager } from '@wix/thunderbolt-symbols'
import { NavigationManagerSymbol } from '@wix/thunderbolt-symbols'

export const PostNavigationFocusSymbol = Symbol('PostNavigationFocus')

export interface IPostNavigationFocus {
	focus: () => void
}

const postNavigationFocusFactory = (navigationManager: INavigationManager): IPostNavigationFocus => {
	return {
		focus: () => {
			if (process.env.browser) {
				if (navigationManager.isFirstPage()) {
					const targetElement = document.getElementById('SCROLL_TO_TOP')
					targetElement?.focus({ preventScroll: true })
				} else {
					const target = document.querySelector('main section') as HTMLElement
					target?.setAttribute('tabIndex', '-1')
					target?.setAttribute('aria-label', 'main content')
					target?.focus({ preventScroll: true })
				}
			}
		},
	}
}

export const PostNavigationFocus = withDependencies(
	[NavigationManagerSymbol],
	(navigationManager: INavigationManager) => postNavigationFocusFactory(navigationManager)
)
