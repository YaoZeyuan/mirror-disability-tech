import type {
	IAppWillLoadPageHandler,
	ILogger,
	IPageWillMountHandler,
	BrowserWindow,
	IPageInitializer,
	IPageProvider,
} from '@wix/thunderbolt-symbols'
import {
	LifeCycle,
	LoggerSymbol,
	LOADING_PHASES,
	BrowserWindowSymbol,
	PageProviderSymbol,
} from '@wix/thunderbolt-symbols'
import { multi, withDependencies } from '@wix/thunderbolt-ioc'
import { taskify, yieldToMain } from '@wix/thunderbolt-commons'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'
import type { INavigationPhases } from 'feature-navigation-phases'
import { NavigationPhasesSymbol } from 'feature-navigation-phases'

class PageInitializerError extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PageInitializerError' // for grouping the errors in the rollout grafana
	}
}

class PageInitializerDiagnosticTimeout extends Error {
	constructor(message: string) {
		super(message)
		this.name = 'PageInitializerDiagnosticTimeout'
	}
}

const INIT_PAGE_DIAGNOSTIC_TIMEOUT_MS = 15000
const INIT_PAGE_DIAGNOSTIC_INTERVAL_MS = 5000

export const PageInitializer = withDependencies(
	[
		multi(LifeCycle.AppWillLoadPageHandler),
		PageProviderSymbol,
		LoggerSymbol,
		NavigationManagerSymbol,
		NavigationPhasesSymbol,
		BrowserWindowSymbol,
	] as const,
	(
		appWillLoadPageHandlers: Array<IAppWillLoadPageHandler>,
		pageProvider: IPageProvider,
		logger: ILogger,
		navigationManager: INavigationManager,
		navigationPhases: INavigationPhases,
		browserWindow: BrowserWindow
	): IPageInitializer => ({
		initPage: async ({ pageId, contextId, anchorDataId, isLightbox }) => {
			logger.interactionStarted('init_page')
			navigationPhases.clear()

			const pendingHandlers = new Set<string>()
			const completedHandlers = new Set<string>()
			const markStarted = (name: string) => pendingHandlers.add(name)
			const markCompleted = (name: string) => {
				pendingHandlers.delete(name)
				completedHandlers.add(name)
			}

			let diagnosticIntervalId: ReturnType<typeof setInterval> | null = null
			let elapsedMs = INIT_PAGE_DIAGNOSTIC_TIMEOUT_MS

			const reportDiagnostic = () => {
				const pending = Array.from(pendingHandlers)
				const completed = Array.from(completedHandlers)
				logger.captureError(
					new PageInitializerDiagnosticTimeout(
						`init_page still pending after ${elapsedMs / 1000}s. Pending: [${pending.join(', ')}]`
					),
					{
						tags: { feature: 'pages', methodName: 'initPage' },
						extra: {
							pending: JSON.stringify(pending),
							completed: JSON.stringify(completed),
							pageId,
							contextId,
							elapsedMs: String(elapsedMs),
						},
					}
				)
			}

			const diagnosticTimeoutId = setTimeout(() => {
				reportDiagnostic()
				diagnosticIntervalId = setInterval(() => {
					elapsedMs += INIT_PAGE_DIAGNOSTIC_INTERVAL_MS
					reportDiagnostic()
				}, INIT_PAGE_DIAGNOSTIC_INTERVAL_MS)
			}, INIT_PAGE_DIAGNOSTIC_TIMEOUT_MS)

			const shouldReportHandler = (handler: Function) =>
				navigationManager.isFirstNavigation() && handler.constructor.name === 'AsyncFunction'

			logger.phaseStarted(LOADING_PHASES.PAGE_REFLECTOR)
			await yieldToMain()
			const pageReflectorPromise = pageProvider(contextId, pageId, anchorDataId)
			markStarted('pageReflector')
			const pageWillMount = taskify(async () => {
				const pageReflector = await pageReflectorPromise
				markCompleted('pageReflector')
				logger.phaseEnded(LOADING_PHASES.PAGE_REFLECTOR)
				const pageWillMountHandlers = await pageReflector.getAllImplementersOfAsync<IPageWillMountHandler>(
					LifeCycle.PageWillMountHandler
				)

				// TB-4458 upon navigation, we want to run all lifecycles that may change props synchronously so that we don't re-render components with partial props
				// TODO things work by chance. we should probably block react rendering during navigation.

				const pageWillMountWithReporting = async (handler: IPageWillMountHandler) => {
					const handlerName = `pageWillMount_${handler.name}`
					markStarted(handlerName)
					const phaseEnd = navigationPhases.start(handlerName)
					if (shouldReportHandler(handler.pageWillMount)) {
						logger.phaseStarted(handlerName)
					}
					try {
						await handler.pageWillMount(pageId)
					} catch (e) {
						markCompleted(handlerName)
						logger.captureError(new PageInitializerError(`pageWillMount failed: ${handler.name}`), {
							tags: { feature: 'pages', methodName: 'initPage', handler: handler.name },
							extra: { error: e },
						})
						throw e
					}
					markCompleted(handlerName)
					phaseEnd()
					if (shouldReportHandler(handler.pageWillMount)) {
						logger.phaseEnded(handlerName)
					}
				}

				await Promise.all(
					navigationManager.isFirstNavigation()
						? pageWillMountHandlers.map((handler) => taskify(() => pageWillMountWithReporting(handler)))
						: pageWillMountHandlers.map(pageWillMountWithReporting)
				)
			})

			try {
				await Promise.all([
					pageWillMount,
					...appWillLoadPageHandlers.map((handler) =>
						taskify(async () => {
							const handlerName = `appWillLoadPage_${handler.name}`
							markStarted(handlerName)
							const phaseEnd = navigationPhases.start(handlerName)
							if (shouldReportHandler(handler.appWillLoadPage)) {
								logger.phaseStarted(handlerName)
							}
							try {
								await yieldToMain()
								await handler.appWillLoadPage({ pageId, contextId, isLightbox })
							} catch (e) {
								markCompleted(handlerName)
								logger.captureError(new PageInitializerError(`appWillLoadPage failed: ${handler.name}`), {
									tags: { feature: 'pages', methodName: 'initPage', handler: handler.name },
									extra: { error: e },
								})
								throw e
							}
							markCompleted(handlerName)
							phaseEnd()
							if (shouldReportHandler(handler.appWillLoadPage)) {
								logger.phaseEnded(handlerName)
							}
						})
					),
				])
			} finally {
				clearTimeout(diagnosticTimeoutId)
				if (diagnosticIntervalId) {
					clearInterval(diagnosticIntervalId)
				}
			}
			logger.addBreadcrumbToBatch('init_page_phase_durations', navigationPhases.getPhases())
			logger.interactionEnded('init_page', {
				paramsOverrides: {
					http_referrer: browserWindow?.document.referrer || '',
				},
			})
		},
	})
)
