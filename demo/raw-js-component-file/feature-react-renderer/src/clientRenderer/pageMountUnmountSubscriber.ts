import { yieldToMain } from '@wix/thunderbolt-commons'
import type {
	IPageDidLoadHandler,
	IAppWillLoadPageHandler,
	IPageDidMountHandler,
	IPageDidUnmountHandler,
	IPropsStore,
	IStructureAPI,
	RegisterToUnmount,
	IAppDidLoadPageHandler,
	IPageProvider,
} from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, LifeCycle, Props, StructureAPI, PageProviderSymbol } from '@wix/thunderbolt-symbols'
import { multi, optional, withDependencies } from '@wix/thunderbolt-ioc'
import { ComponentCssSym, PageTransitionsHandlerSymbol } from '../symbols'
import type { IPageTransitionsHandler, IThunderboltCssComponentRenderer } from '../types'

export const PageMountUnmountSubscriber = withDependencies(
	[
		Props,
		StructureAPI,
		PageProviderSymbol,
		BrowserWindowSymbol,
		PageTransitionsHandlerSymbol,
		multi(LifeCycle.AppDidLoadPageHandler),
		optional(ComponentCssSym),
	] as const,
	(
		props: IPropsStore,
		structureApi: IStructureAPI,
		pageReflectorProvider: IPageProvider,
		window,
		pageTransitionHandler: IPageTransitionsHandler,
		appDidLoadPageHandlers: Array<IAppDidLoadPageHandler>,
		ComponentCss?: IThunderboltCssComponentRenderer
	): IAppWillLoadPageHandler & RegisterToUnmount => {
		let dynamicllyRegisteredUnmountHandlers: Array<IPageDidUnmountHandler['pageDidUnmount']> = []
		return {
			name: 'pageMountUnmountSubscriber',
			registerToPageDidUnmount: (pageDidUnmount: IPageDidUnmountHandler['pageDidUnmount']) => {
				dynamicllyRegisteredUnmountHandlers.push(pageDidUnmount)
			},
			appWillLoadPage: async ({ pageId, contextId, isLightbox }) => {
				const pageReflector = await pageReflectorProvider(contextId, pageId)
				const pageDidMountHandlers = pageReflector.getAllImplementersOf<IPageDidMountHandler>(
					LifeCycle.PageDidMountHandler
				)
				const pageDidUnmountHandlers = pageReflector
					.getAllImplementersOf<IPageDidUnmountHandler>(LifeCycle.PageDidUnmountHandler)
					.map((m) => m.pageDidUnmount)

				const pageDidLoadHandlers = pageReflector.getAllImplementersOf<IPageDidLoadHandler>(
					LifeCycle.PageDidLoadHandler
				)

				const triggerAppDidLoadPageHandlers = () => {
					pageDidLoadHandlers.map((handler) => handler.pageDidLoad({ pageId, contextId: contextId! }))
					appDidLoadPageHandlers.map((handler) => handler.appDidLoadPage({ pageId, contextId: contextId! }))
				}

				const wrapperId = structureApi.getPageWrapperComponentId(pageId, contextId)

				const clearPreviousPageCss = () => {
					const pagesContainerProps = props.get('site-root')
					if (pagesContainerProps?.componentsCss?.length > 1) {
						props.update({
							'site-root': {
								componentsCss:
									pagesContainerProps.componentsCss.filter((c: { contextId: string }) => c.contextId !== contextId) ||
									[],
							},
						})
					}
				}

				const { componentsCss = [] } = props.get('site-root') || {}

				const compCss = ComponentCss?.render(pageId)
				// If the page is a popup page, we don't want to render the css in the site root, but in the page wrapper
				// This logic is only relevant for the editor, on live sites the css is rendered in the head.
				const shouldRenderCssInSiteRoot = !isLightbox

				props.update({
					...(shouldRenderCssInSiteRoot && {
						'site-root': {
							componentsCss: [
								{ contextId, CSS: compCss },
								...componentsCss.filter(
									(c: { contextId: string; CSS?: React.ReactElement }) => c.contextId !== contextId
								),
							],
						},
					}),
					[wrapperId]: {
						...(!shouldRenderCssInSiteRoot && { ComponentCss: compCss }),
						pageDidMount: async (isMounted: boolean) => {
							await yieldToMain()
							if (isMounted) {
								if (!pageTransitionHandler.hasPageTransitions()) {
									triggerAppDidLoadPageHandlers()
								}

								const funcs = await Promise.all(
									pageDidMountHandlers.map((pageDidMountHandler) => pageDidMountHandler.pageDidMount(pageId))
								)

								const unsubscribeFuncs = funcs.filter((x) => x) as Array<Exclude<(typeof funcs)[number], void>>
								pageDidUnmountHandlers.push(...unsubscribeFuncs)
								pageDidUnmountHandlers.push(clearPreviousPageCss)
							} else if (window) {
								// Make sure all the descendants are unmounted (window is always defined on unmount flow)
								window.requestAnimationFrame(async () => {
									await Promise.all(
										[...dynamicllyRegisteredUnmountHandlers, ...pageDidUnmountHandlers].map((pageDidUnmount) =>
											pageDidUnmount(pageId)
										)
									)
									// TODO: verify if needed
									dynamicllyRegisteredUnmountHandlers = []
								})
							}
						},
					},
				})
			},
		}
	}
)
