import { loadRequireJS } from '@wix/thunderbolt-commons'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, Experiments, ILogger, ViewerModel } from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	ExperimentsSymbol,
	LoggerSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
} from '@wix/thunderbolt-symbols'
import type { ComponentType } from 'react'
import type { Reporter } from '../reporting'
import { OOIReporterSymbol } from '../reporting'
import { ModuleFederationSharedScopeSymbol, name } from '../symbols'
import type { Props } from '../tpaWidgetNativeFactory/tpaWidgetNative'
import type { OOIComponentLoader, OOIModule, WebpackSharedScope, OOISiteConfig } from '../types'
import { loadComponentWithModuleFederation } from './loadComponentWithModuleFederation'
import { extractWidgetNameFromUrl } from '../extractWidgetNameFromUrl'

async function requireTpaWidgetNativeClient() {
	await window.externalsRegistry.react.loaded // wait for React to load since it is loaded dynamically
	return require('../tpaWidgetNativeFactory/tpaWidgetNativeClient')
}

export default withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		ViewerModelSym,
		LoggerSymbol,
		OOIReporterSymbol,
		BrowserWindowSymbol,
		ExperimentsSymbol,
		ModuleFederationSharedScopeSymbol,
	],
	(
		{ ooiComponentsData, isBuilderComponentModel }: OOISiteConfig,
		{ siteAssets, requestUrl, mode: { debug } }: ViewerModel,
		logger: ILogger,
		reporter: Reporter,
		window: NonNullable<BrowserWindow>,
		experiments: Experiments,
		sharedScope: WebpackSharedScope
	): OOIComponentLoader => {
		let waitForRequireJsToLoad: Promise<unknown> | null = null
		const widgetModulePromises: Map<string, Promise<OOIModule>> = new Map()

		const loadAndConfigureRequireJS = async () => {
			await loadRequireJS(window, siteAssets.clientTopology.moduleRepoUrl)

			// @ts-ignore
			window.require.config({
				waitSeconds: 30,
			})

			// @ts-ignore TODO fix requirejs type
			window.requirejs!.onError = (error) => {
				const { requireModules, requireType } = error
				logger.captureError(error, {
					tags: { feature: 'commons', methodName: 'requirejs.onError' },
					extra: { requireModules, requireType },
				})
			}
		}

		const load = async <T>(url: string): Promise<T> => {
			waitForRequireJsToLoad = waitForRequireJsToLoad || loadAndConfigureRequireJS()
			await waitForRequireJsToLoad

			return new Promise((resolve, reject) => {
				__non_webpack_require__([url], (module: any) => resolve(module), reject)
			})
		}

		async function loadFederated<T>(url: string): Promise<T> {
			waitForRequireJsToLoad = waitForRequireJsToLoad || loadAndConfigureRequireJS()
			await waitForRequireJsToLoad
			const widgetName = extractWidgetNameFromUrl(url)
			const moduleFederationEntryUrl = url.replace(/\/[^/]+\.js$/, `/clientContainer${widgetName}.min.js`)

			return await loadComponentWithModuleFederation(moduleFederationEntryUrl, widgetName!, sharedScope)
		}

		const getModule = async (widgetId: string, useNoCssComponentIfExists: boolean = true) => {
			const {
				componentUrl: withCssComponentUrl,
				noCssComponentUrl,
				isModuleFederated,
				isServerBundled,
				isLoadable,
			} = ooiComponentsData[widgetId]
			const componentUrl = useNoCssComponentIfExists ? noCssComponentUrl || withCssComponentUrl : withCssComponentUrl
			const module = await (
				isModuleFederated && experiments['specs.thunderbolt.module_federation']
					? loadFederated<{ default: ComponentType<Props> }>(componentUrl)
					: load<{ default: ComponentType<Props> }>(componentUrl)
			).catch((err) => {
				if (debug) {
					console.error(`widget failed to load [${widgetId}]:`, err)
				}
			})

			if (!module || !module.default) {
				console.error(
					`Widget with widgetId: ${widgetId} did not return a module of React component or failed to load.
						componentUrl: ${componentUrl}
						Check the console / network for network errors or misconfigurations.`
				)
				logger.captureError(new Error('widget did not return a module of React component'), {
					tags: { feature: 'ooi', methodName: 'getComponent' },
					extra: {
						widgetId,
						componentUrl,
						isModuleFederated,
						module_federation: experiments['specs.thunderbolt.module_federation'],
					},
				})

				return renderDeadComponent()
			}

			const { ooiReactComponentClientWrapper } = await requireTpaWidgetNativeClient()
			// @ts-ignore
			// oxlint-disable-next-line no-unsafe-optional-chaining
			const { component, chunkLoadingGlobal, loadableReady } = module?.default

			const forceServerBundle = requestUrl.includes('forceServerBundle=true')
			const shouldWrapWithSuspense = forceServerBundle || isServerBundled || false
			const shouldAddIdAsClassName = !!(experiments['specs.thunderbolt.addIdAsClassName'] || isBuilderComponentModel)
			const shouldModifyComponentId = !!(experiments['specs.thunderbolt.useClassSelectors'] || isBuilderComponentModel)
			const dontForceHeightAutoOOI = !!experiments['specs.thunderbolt.DontForceHeightAutoOOI']
			return {
				component: ooiReactComponentClientWrapper(
					component,
					reporter,
					shouldWrapWithSuspense,
					shouldAddIdAsClassName,
					shouldModifyComponentId,
					dontForceHeightAutoOOI,
					isBuilderComponentModel
				),
				waitForLoadableReady: async (compId: string) => {
					/**
					 * loadableReady should come from the OOI bundle to share the same registry with its internal loadable functions:
					 * slack: https://wix.slack.com/archives/C026GJZFTBJ/p1634912220010100
					 * chunkLoadingGlobal is the namespcaes of the OOI component to fix issues with multiple loadable apps on the same page
					 * issue: https://github.com/gregberge/loadable-components/pull/701
					 */
					if (isLoadable && loadableReady && chunkLoadingGlobal) {
						await new Promise((resolve) => loadableReady(resolve, { chunkLoadingGlobal, namespace: compId }))
					}
				},
			}
		}

		async function renderDeadComponent() {
			const { ooiReactComponentClientWrapper } = await requireTpaWidgetNativeClient()
			const dontForceHeightAutoOOI = !!experiments['specs.thunderbolt.DontForceHeightAutoOOI']
			return {
				component: ooiReactComponentClientWrapper(
					null,
					reporter,
					false,
					false,
					false,
					dontForceHeightAutoOOI,
					isBuilderComponentModel
				),
			}
		}

		return {
			async getComponent(widgetId: string, useNoCssComponentIfExists: boolean = true) {
				if (requestUrl.includes('disableAllPlatformApps')) {
					return renderDeadComponent()
				}
				if (widgetModulePromises.has(widgetId)) {
					return widgetModulePromises.get(widgetId) as Promise<OOIModule>
				}
				if (!ooiComponentsData[widgetId]) {
					console.error(`
						Widget with widgetId: ${widgetId} is not registered in ooiComponentsData.
						This is likely a clientSpecMap configuration issue, or a caching issue.
					`)
					logger.captureError(new Error('widgetId could not be found in ooiComponentsData'), {
						tags: { feature: 'ooi', methodName: 'getComponent' },
						extra: { widgetId },
					})

					return renderDeadComponent()
				}
				const module = getModule(widgetId, useNoCssComponentIfExists)
				widgetModulePromises.set(widgetId, module)
				return module
			},
		}
	}
)
