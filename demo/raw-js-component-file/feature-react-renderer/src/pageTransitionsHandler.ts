import { multi, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageTransitionsHandler } from './types'
import type {
	IPageDidLoadHandler,
	IAppWillLoadPageHandler,
	IAppDidLoadPageHandler,
	IPageProvider,
} from '@wix/thunderbolt-symbols'
import { LifeCycle, PageTransitionsCompletedSymbol, PageProviderSymbol } from '@wix/thunderbolt-symbols'
import type { IPageTransitionsCompleted } from 'feature-page-transitions'

export const PageTransitionsHandler = withDependencies(
	[PageProviderSymbol, multi(LifeCycle.AppDidLoadPageHandler)] as const,
	(
		pageReflectorProvider: IPageProvider,
		appDidLoadPageHandlers: Array<IAppDidLoadPageHandler>
	): IPageTransitionsHandler & IAppWillLoadPageHandler => {
		const state = {
			hasPageTransitions: false,
		}

		return {
			name: 'pageTransitionsHandler',
			appWillLoadPage: async ({ pageId, contextId }) => {
				const pageReflector = await pageReflectorProvider(contextId, pageId)
				const pageDidLoadHandlers = pageReflector.getAllImplementersOf<IPageDidLoadHandler>(
					LifeCycle.PageDidLoadHandler
				)
				const [pageTransitionsImp] =
					pageReflector.getAllImplementersOf<IPageTransitionsCompleted>(PageTransitionsCompletedSymbol)
				state.hasPageTransitions = !!pageTransitionsImp

				const triggerAppDidLoadPageHandlers = () => {
					pageDidLoadHandlers.map((handler) => handler.pageDidLoad({ pageId, contextId: contextId! }))
					appDidLoadPageHandlers.map((handler) => handler.appDidLoadPage({ pageId, contextId: contextId! }))
				}

				if (state.hasPageTransitions) {
					pageTransitionsImp.onPageTransitionsCompleted(triggerAppDidLoadPageHandlers)
				}
			},
			hasPageTransitions: () => state.hasPageTransitions,
		}
	}
)
