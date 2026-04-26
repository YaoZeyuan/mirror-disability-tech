import _ from 'lodash'
import { proxy, wrap, createEndpoint } from 'comlink/dist/esm/comlink.js'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type {
	IComponentsStylesOverrides,
	IPropsStore,
	PlatformWorkerPromise,
	ILogger,
	IStructureStore,
	Experiments,
	ICompsLifeCycle,
	INavigationManager,
	BrowserWindow,
	IDomSelectors,
} from '@wix/thunderbolt-symbols'
import {
	Props,
	Structure,
	ComponentsStylesOverridesSymbol,
	PlatformWorkerPromiseSym,
	LoggerSymbol,
	ExperimentsSymbol,
	CompsLifeCycleSym,
	NavigationManagerSymbol,
	BrowserWindowSymbol,
	DomSelectorsSymbol,
} from '@wix/thunderbolt-symbols'
import type { BootstrapData, PlatformInitializer, PlatformWarmupDataManagerAPI } from '../types'
import type { InvokeSiteHandler, InvokeViewerHandler, PlatformClientWorkerAPI } from '../core/types'
import { PlatformWarmupDataManagerSymbol } from '../symbols'
import { getFullId, getPanoramaGlobalConfig } from '@wix/thunderbolt-commons'
import { createBatchQueue, factory as biLoggerFactory } from '@wix/fe-essentials-viewer-platform/bi'

export default withDependencies<PlatformInitializer>(
	[
		PlatformWarmupDataManagerSymbol,
		Props,
		Structure,
		ComponentsStylesOverridesSymbol,
		LoggerSymbol,
		PlatformWorkerPromiseSym,
		ExperimentsSymbol,
		CompsLifeCycleSym,
		NavigationManagerSymbol,
		BrowserWindowSymbol,
		DomSelectorsSymbol,
	],
	(
		platformWarmupDataManager: PlatformWarmupDataManagerAPI,
		propsStore: IPropsStore,
		structureStore: IStructureStore,
		componentsStylesOverrides: IComponentsStylesOverrides,
		logger: ILogger,
		{ platformWorkerPromise }: { platformWorkerPromise: PlatformWorkerPromise },
		experiments: Experiments,
		compsLifeCycle: ICompsLifeCycle,
		navigationManager: INavigationManager,
		browserWindow: NonNullable<BrowserWindow>,
		domSelectors: IDomSelectors
	): PlatformInitializer => {
		const isDynamicHydrationEnabled = experiments['specs.thunderbolt.viewport_hydration_extended_react_18']
		const shouldWaitForCompRender = () =>
			isDynamicHydrationEnabled && navigationManager.isFirstPage() && !window.clientSideRender
		platformWorkerPromise
			.then((worker) => {
				if (worker) {
					worker.addEventListener('error', ({ message }) => {
						logger.captureError(new Error(message), {
							tags: { feature: 'platform', worker: true, dontReportIfPanoramaEnabled: true },
						})
					})
					worker.addEventListener('message', (event) => {
						if (event.data?.type === 'workerBatchEvent') {
							getPanoramaGlobalConfig().getBatchQueue()?.enqueue(event.data.data)
						}
					})
					const biLoggersByEndpoint = new Map<string, any>()
					const getLoggerForEndpoint = (endpoint: string) => {
						if (!biLoggersByEndpoint.has(endpoint)) {
							biLoggersByEndpoint.set(
								endpoint,
								biLoggerFactory({ useBatch: true, endpoint }).setGlobalBatchQueue(createBatchQueue()).logger()
							)
						}
						return biLoggersByEndpoint.get(endpoint)
					}
					worker.addEventListener('message', (event) => {
						if (event.data?.type === 'workerBiEvent') {
							const { event: biEvent, context } = event.data.data
							getLoggerForEndpoint(context?.endpoint || '').log(biEvent, context)
						}
					})
				}
			})
			.catch((e) => {
				throw new Error(`platformWorkerPromise falied with error - ${e}`)
			})

		const getCompIdToWaitFor = async (compId: string) =>
			(await platformWarmupDataManager.shouldWaitToRenderWithFullCompId(compId)) ? getFullId(compId) : compId

		return {
			async initPlatformOnSite(bootstrapData: BootstrapData, invokeSiteHandler: InvokeSiteHandler) {
				const worker = await platformWorkerPromise
				if (!worker) {
					console.warn('[platformWorkerInitializer] No platform worker available, skipping initPlatformOnSite')
					return
				}
				const { initPlatformOnSite }: PlatformClientWorkerAPI = wrap(worker)
				initPlatformOnSite(
					bootstrapData,
					proxy(async (...args) => {
						const res = await invokeSiteHandler(...args)
						return _.isFunction(res) ? proxy(res) : res
					})
				)
			},
			async runPlatformOnPage(bootstrapData: BootstrapData, invokeViewerHandler: InvokeViewerHandler) {
				const worker = await platformWorkerPromise
				if (!worker) {
					console.warn('[platformWorkerInitializer] No platform worker available, skipping runPlatformOnPage')
					return
				}
				const workerProxy = wrap(worker)
				const workerMessagePort = await workerProxy[createEndpoint]()
				// prevent malicious "self.onmessage =" user code from sniffing messages upon navigation, specifically platformEnvData.site.applicationsInstances.
				const workerSecureProxy: PlatformClientWorkerAPI = wrap(workerMessagePort)
				return workerSecureProxy.runPlatformOnPage(
					bootstrapData,
					proxy(async (...args) => {
						const res = await invokeViewerHandler(...args)
						return _.isFunction(res) ? proxy(res) : res
					})
				)
			},
			async updateProps(partialProps) {
				if (shouldWaitForCompRender()) {
					_.forEach(partialProps, async (compProps, compId) => {
						if (!domSelectors.getByCompId(compId, browserWindow.document)) {
							propsStore.update({ [compId]: compProps })
						}
						compsLifeCycle.waitForComponentToRender(await getCompIdToWaitFor(compId)).then(async () => {
							propsStore.update({ [compId]: compProps })
						})
					})
				} else if (await platformWarmupDataManager.shouldUseManager()) {
					await platformWarmupDataManager.updateProps(partialProps)
				} else {
					propsStore.update(partialProps)
				}
			},
			async updateStyles(styleData) {
				if (await platformWarmupDataManager.shouldUseManager()) {
					await platformWarmupDataManager.updateStyles(styleData)
				} else {
					componentsStylesOverrides.set(styleData)
				}
			},
			async updateStructure(partialStructure) {
				if (shouldWaitForCompRender()) {
					_.forEach(partialStructure, async (compStructure, compId) => {
						compsLifeCycle.waitForComponentToRender(compId).then(async () => {
							structureStore.update({ [compId]: compStructure })
						})
					})
				} else if (await platformWarmupDataManager.shouldUseManager()) {
					await platformWarmupDataManager.updateStructure(partialStructure)
				} else {
					structureStore.update(partialStructure)
				}
			},
		}
	}
)
