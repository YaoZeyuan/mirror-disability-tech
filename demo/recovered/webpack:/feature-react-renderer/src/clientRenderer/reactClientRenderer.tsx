import React from 'react'
import ReactDOM from 'react-dom'
import { withDependencies, optional, multi, named } from '@wix/thunderbolt-ioc'
import type {
	IRenderer,
	BatchingStrategy,
	ILayoutDoneService,
	Experiments,
	IBaseComponent,
	ViewerModel,
	ILogger,
} from '@wix/thunderbolt-symbols'
import {
	BatchingStrategySymbol,
	LayoutDoneServiceSymbol,
	ExperimentsSymbol,
	BaseComponentSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
	LoggerSymbol,
	TBInstanceIdSymbol,
} from '@wix/thunderbolt-symbols'
import { createPromise } from '@wix/thunderbolt-commons'
import type {
	IRendererPropsProvider,
	RendererProps,
	IThunderboltRootComponentRenderer,
	IThunderboltCssComponentRenderer,
	ReactRendererSiteConfig,
	IAppDidMountService,
} from '../types'
import {
	RendererPropsProviderSym,
	ThunderboltRootComponentRendererSym,
	name,
	ComponentCssSym,
	AppDidMountServiceSymbol,
} from '../symbols'
import { ExternalComponentUiLibProvidersSymbol } from 'feature-external-component'
import type { UiLibProviders } from 'feature-external-component'
import type { ErrorInfo } from 'react-dom/client'

export const AppRootRenderer = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		RendererPropsProviderSym,
		BatchingStrategySymbol,
		BaseComponentSymbol,
		TBInstanceIdSymbol,
		AppDidMountServiceSymbol,
		optional(LayoutDoneServiceSymbol),
		optional(ExternalComponentUiLibProvidersSymbol),
	],
	(
		{ disabledComponents, isBuilderComponentModel }: ReactRendererSiteConfig,
		rendererProps: IRendererPropsProvider,
		batchingStrategy: BatchingStrategy,
		BaseComponent: IBaseComponent,
		tbInstanceId: string,
		appDidMountService: IAppDidMountService,
		layoutDoneService: ILayoutDoneService,
		externalComponentUiLibProviders?: UiLibProviders
	): IThunderboltRootComponentRenderer => ({
		render: (rootCompId) => {
			const App = externalComponentUiLibProviders
				? externalComponentUiLibProviders.wrapProviders(require('../components/App').default)
				: require('../components/App').default // App creates a React Context on module state, so it has to be evaluated once React is defined.
			const props = rendererProps.getRendererProps()
			return (
				<App
					key={tbInstanceId}
					{...props}
					batchingStrategy={batchingStrategy}
					onDidMount={appDidMountService.resolve}
					{...(layoutDoneService ? { layoutDoneService } : {})}
					rootCompId={rootCompId}
					BaseComponent={BaseComponent}
					disabledComponents={disabledComponents}
					isBuilderComponentModel={isBuilderComponentModel}
				/>
			)
		},
	})
)

export const ReactClientRenderer = withDependencies(
	[
		multi(ThunderboltRootComponentRendererSym),
		RendererPropsProviderSym,
		ExperimentsSymbol,
		ViewerModelSym,
		LoggerSymbol,
		AppDidMountServiceSymbol,
		optional(ComponentCssSym),
	],
	(
		renderers: Array<IThunderboltRootComponentRenderer>,
		rendererProps: IRendererPropsProvider,
		experiments: Experiments,
		viewerModel: ViewerModel,
		logger: ILogger,
		appDidMountService: IAppDidMountService,
		componentCss?: IThunderboltCssComponentRenderer
	): IRenderer<RendererProps, Promise<void>> => ({
		getRendererProps: rendererProps.getRendererProps,
		init: async () => {
			await rendererProps.resolveRendererProps()
		},
		render: async ({
			rootCompId = 'main_MF',
			target = document.getElementById('SITE_CONTAINER') as HTMLElement,
			cssRootCompIds = ['masterPage'],
		}) => {
			if (experiments['specs.thunderbolt.skip_hydration']) {
				return
			}
			function defineAndReportReactError() {
				const { error } = console
				console.error = (...args) => {
					try {
						const isStringError = args[0] && args[0].includes && args[0].includes('Error: Minified React error')
						const isObjectError = args[0] && args[0].message && args[0].message.includes('Error: Minified React error')
						if (isStringError || isObjectError) {
							logger.meter('react_render_error', {
								customParams: {
									error: 'Error: Minified React error',
									type: 'Minified React error',
								},
							})
							logger.captureError(new Error(args[0]), {
								tags: { reactError: true, feature: 'react-render' },
								extra: { args },
							})
						}
					} catch (e) {
						error(e)
					}
					error(...args)
				}
			}

			await window.reactAndReactDOMLoaded
			const app = (
				<React.StrictMode>
					<React.Fragment>
						{cssRootCompIds.map((cssRootCompId) => componentCss?.render(cssRootCompId))}
						{renderers.map((renderer, key) => renderer.render(rootCompId, key))}
					</React.Fragment>
				</React.StrictMode>
			)
			if (target.firstChild) {
				const isReact18 = React.version.startsWith('18')
				const isReactDebugMode = viewerModel.requestUrl.includes('debugReact=true')
				if (isReact18) {
					const reactRenderWrapper = (fn: Function) => {
						// @ts-ignore
						React.startTransition(() => {
							fn()
						})
					}

					defineAndReportReactError()
					reactRenderWrapper(async () => {
						try {
							await window.externalsRegistry.reactDOM.loaded
							require('react-dom/client').hydrateRoot(target, app, {
								onRecoverableError: (error: Error, errInfo: ErrorInfo) => {
									logger.meter('react_render_error', {
										customParams: {
											error: error.message,
											type: 'onRecoverableError',
										},
									})
									logger.captureError(error, {
										tags: { reactError: true, feature: 'react-render' },
									})
									if (isReactDebugMode) {
										console.error('componentStack - ', errInfo.componentStack)
									}
								},
							})
						} catch (e) {
							logger.meter('react_render_error', {
								customParams: {
									error: e.message,
									type: 'exception',
								},
							})
							logger.captureError(e, {
								tags: { reactError: true, feature: 'react-render' },
							})
						}
					})
				} else {
					// Add hooks empty function
					// This is in order to allow usage of this hook without breaking React 16 fallback
					React.useTransition = () => [false, (cb: Function) => cb()]
					React.useDeferredValue = (value) => value

					// Hydrate as React 16
					ReactDOM.hydrate(app, target)
				}
			} else {
				const isReact18 = React.version.startsWith('18')
				// @ts-ignore
				isReact18 ? ReactDOM.createRoot(target).render(app) : ReactDOM.render(app, target)
			}
			await appDidMountService.getPromise()
		},
	})
)
