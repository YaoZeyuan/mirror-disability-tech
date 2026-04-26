import type {
	Interaction,
	Phase,
	LoggerConfig,
	BiSsrEvent,
	PhaseLoggerOptions,
	CreateLoggerApi,
	ILogger,
	ServerPerformanceEvent,
	PlatformAppPerformanceEvent,
	ResourceFetchPerformanceEvent,
} from '@wix/thunderbolt-types'
import type {
	IStartInteractionOptions,
	IEndInteractionOptions,
	IAppIdentifier,
} from '@wix/fe-essentials-viewer-platform/fedops'
import type { Event, EventHint, Hub } from '@wix/fe-essentials-viewer-platform/sentry/types'
import {
	extractFingerprints,
	extractFileNameFromErrorStack,
	addTagsFromObjectToEvent,
	shouldFilter,
} from './utils/loggerUtils'
import { SSRPerformanceStore } from './utils/SSRPerformanceStore'
import { addRerouteDataToSentryEvent, isSentryEventFromNonWixTpa } from './utils/monitoring'

export { SSRPerformanceStore }

export class ErrorWithMinimalStack extends Error {
	constructor(error: Error) {
		super(error.message)
		this.name = error.name

		if (typeof Error.captureStackTrace === 'function') {
			Error.captureStackTrace(this, this.constructor)
		}

		// long stacks freeze the browser during some sentry internal calculation.
		// somewhere here: https://github.com/getsentry/sentry-javascript/blob/668f44ffdb068cd2d0f89085e50c9d1b4dd38295/packages/browser/src/tracekit.ts#L186
		// this is internal crap that can't be unit tested.
		const stack = error.stack
		if (!stack || stack.length <= 2000) {
			return
		}
		this.stack = `${stack.substring(0, 1000)}\n...\n${stack.substring(stack.length - 1000)}`
	}
}

declare global {
	interface Window {
		Sentry: Hub & {
			forceLoad: () => void
			onLoad: (handler: () => void) => void
			addGlobalEventProcessor: (handler: (event: Event, hint: EventHint) => Event | null) => void
		}
	}
}

export const createLoggerApi: CreateLoggerApi = ({
	biLoggerFactory,
	ssrBiLoggerFactory,
	requestStartTime,
	fedopsLogger,
	sentry,
	sentryStore,
	errorLimit,
	shouldMuteErrors = false,
	isSsr = false,
	ssrInitialEvents = [],
	onReport = () => {},
}: LoggerConfig): ILogger => {
	let sessionErrorLimit = errorLimit || 99999
	let globalTags = {},
		globalExtras = {}

	const ssrPerformanceStore = SSRPerformanceStore(ssrInitialEvents)
	const ongoingfedops = {
		interactions: 'none',
		phase: 'none',
		errors: 'none',
	}
	if (!isSsr) {
		// @ts-ignore
		window.fedops.ongoingfedops = ongoingfedops
	}

	const updatePageNumber = (pageNumber: number) => {
		biLoggerFactory.updateDefaults({ pn: pageNumber, isFirstNavigation: pageNumber === 1 })
	}
	const updatePageId = (id: string) => {
		biLoggerFactory.updateDefaults({ pageId: id })
	}
	const updateApplicationsMetaSite = (instance: string) => {
		if (instance) {
			biLoggerFactory.updateDefaults({ _mt_instance: instance })
		}
	}

	const getInstance = (forceLoad: boolean = false) => {
		if (isSsr) {
			return sentry
		} else {
			if (forceLoad) {
				window.Sentry.forceLoad?.()
			}

			// @ts-ignore no force load for type hub - exactly what we need to verify
			if (sentry && !sentry.forceLoad) {
				return sentry
			}

			return window.Sentry
		}
	}

	getInstance().configureScope((scope) => {
		scope.addEventProcessor((event, hint) => {
			addRerouteDataToSentryEvent(event)

			// Don't process event if the error originated from an external app
			if (isSentryEventFromNonWixTpa(event)) {
				// Clear globals that were set on the scope
				delete event.user
				delete event.fingerprint
				event.breadcrumbs = []

				return event
			}

			// @ts-ignore
			const message = hint?.originalException?.message ? hint?.originalException.message : hint?.originalException

			if (shouldMuteErrors || shouldFilter(message)) {
				return null
			}

			addTagsFromObjectToEvent(event, {
				...ongoingfedops,
			})

			if (sentryStore.release) {
				event.release = sentryStore.release
			}
			event.environment = sentryStore.environment
			event.extra = event.extra || {}
			Object.assign(event.extra, globalExtras)
			event.tags = event.tags || {}
			Object.assign(event.tags, globalTags)
			if (event.level === 'error') {
				ongoingfedops.errors = message
			}
			if (!event.fingerprint) {
				const fingerprints = extractFingerprints(event.exception)
				event.fingerprint = [...fingerprints]
			}
			if (sessionErrorLimit) {
				sessionErrorLimit--
				return event
			}
			return null
		})

		scope.setUser({ id: sentryStore.user })
	})

	const captureError = (
		error: Error,
		{
			tags,
			extra,
			groupErrorsBy = 'tags',
			level = 'error',
		}: {
			tags: { feature: string; [key: string]: string | boolean }
			extra?: { isFatal?: boolean; [key: string]: any }
			groupErrorsBy?: 'tags' | 'values'
			level?: string
		}
	) => {
		flushBreadcrumbBatch()
		getInstance(true).withScope((scope: any) => {
			const fingerprints = []
			scope.setLevel(level)
			for (const key in tags) {
				if (tags.hasOwnProperty(key)) {
					scope.setTag(key, tags[key])
					if (groupErrorsBy === 'tags') {
						fingerprints.push(key)
					} else if (groupErrorsBy === 'values') {
						fingerprints.push(tags[key])
					}
				}
			}

			for (const key in extra) {
				if (extra.hasOwnProperty(key)) {
					scope.setExtra(key, extra[key])
				}
			}

			const fileName = error.stack ? extractFileNameFromErrorStack(error.stack) : 'unknownFile'
			scope.setExtra('_fileName', fileName)
			scope.setFingerprint([error.message, fileName, ...fingerprints])

			if (sessionErrorLimit) {
				getInstance().captureException(
					// TODO MAW-245 - opting out of ErrorWithMinimalStack in hermes due to an open issue https://github.com/facebook/hermes/issues/928
					process.env.RENDERER_BUILD === 'react-native' ? error : new ErrorWithMinimalStack(error)
				)
			}
			if (level === 'error') {
				console.log(error) // Sentry capture exception swallows the error
			}
		})
	}

	const addBreadcrumb = (messageContent: any, additionalData = {}) =>
		getInstance().addBreadcrumb({
			message: messageContent,
			data: additionalData,
		})

	const breadcrumb = (messageContent: any, additionalData = {}) => {
		flushBreadcrumbBatch()
		addBreadcrumb(messageContent, additionalData)
	}

	const phaseStarted = (
		phase: Phase,
		interactionOptions?: Partial<IAppIdentifier>,
		loggerOptions: PhaseLoggerOptions = {}
	) => {
		ongoingfedops.phase = ongoingfedops.phase === 'none' ? phase : ongoingfedops.interactions + phase
		getInstance().addBreadcrumb({ message: 'interaction start: ' + phase })
		// @ts-ignore
		fedopsLogger.appLoadingPhaseStart(phase, interactionOptions || {})

		ssrPerformanceStore.addSSRPerformanceEvent(phase + ' started')
		onReport(phase, { start: true })

		if (isSsr && loggerOptions.shouldReportSsrBi) {
			reportSsrBi({ phaseName: phase, phaseTime: getPhaseTime(), pageId: loggerOptions.pageId })
		}
	}
	const phaseEnded = (
		phase: Phase,
		interactionOptions?: Partial<IAppIdentifier>,
		loggerOptions: PhaseLoggerOptions = {}
	) => {
		ongoingfedops.phase = ongoingfedops.phase === phase ? 'none' : ongoingfedops.interactions.replace(phase, '')
		getInstance().addBreadcrumb({ message: 'interaction end: ' + phase })
		// @ts-ignore
		fedopsLogger.appLoadingPhaseFinish(phase, interactionOptions || {})

		ssrPerformanceStore.addSSRPerformanceEvent(phase + ' ended')
		onReport(phase, { params: { ...interactionOptions } })

		if (isSsr && loggerOptions.shouldReportSsrBi) {
			if (phase === 'platform') {
				reportPlatformEndEvent()
			} else {
				reportSsrBi({ phaseName: `${phase}_end`, phaseTime: getPhaseTime() })
			}
		}
	}
	const interactionStarted = (
		interaction: Interaction,
		interactionOptions: Partial<IStartInteractionOptions> = {},
		shouldAddBreadcrumb: boolean = true
	) => {
		ongoingfedops.interactions =
			ongoingfedops.interactions === 'none' ? interaction : ongoingfedops.interactions + interaction
		if (shouldAddBreadcrumb) {
			getInstance().addBreadcrumb({ message: 'interaction start: ' + interaction })
		}
		fedopsLogger.interactionStarted(interaction, interactionOptions)

		ssrPerformanceStore.addSSRPerformanceEvent(interaction + ' started')
		onReport(interaction, { start: true })
	}
	const interactionEnded = (
		interaction: Interaction,
		interactionOptions: Partial<IEndInteractionOptions> = {},
		shouldAddBreadcrumb: boolean = true
	) => {
		ongoingfedops.interactions =
			ongoingfedops.interactions === interaction ? 'none' : ongoingfedops.interactions.replace(interaction, '')
		if (shouldAddBreadcrumb) {
			getInstance().addBreadcrumb({ message: 'interaction end: ' + interaction })
		}
		fedopsLogger.interactionEnded(interaction, interactionOptions)

		ssrPerformanceStore.addSSRPerformanceEvent(interaction + ' ended')
		onReport(interaction)
	}
	const meter = (
		metricName: string,
		interactionOptions: Partial<IStartInteractionOptions> = {},
		shouldAddBreadcrumb: boolean = true
	) => {
		if (shouldAddBreadcrumb) {
			getInstance().addBreadcrumb({ message: 'meter: ' + metricName })
		}
		fedopsLogger.interactionStarted(metricName, interactionOptions)
	}
	if (!isSsr) {
		// @ts-ignore
		window.fedops.phaseStarted = phaseStarted
		// @ts-ignore
		window.fedops.phaseEnded = phaseEnded
	}

	let registerPlatformTenantsInvoked = false

	let breadcrumbsBatch = [] as Array<any>
	const MAX_NUM_OF_BREADCRUMBS_IN_BATCH = 100

	const addBreadcrumbToBatch = (message: string, data = {}) => {
		breadcrumbsBatch.push({ message, ...data })
		if (breadcrumbsBatch.length > MAX_NUM_OF_BREADCRUMBS_IN_BATCH) {
			breadcrumbsBatch = breadcrumbsBatch.slice(-MAX_NUM_OF_BREADCRUMBS_IN_BATCH / 2) // drop first items
			breadcrumbsBatch[0].message = `...tail actions. ${breadcrumbsBatch[0].message}`
		}
	}
	const flushBreadcrumbBatch = () => {
		if (breadcrumbsBatch.length) {
			const breadcrumbsBatchObject = breadcrumbsBatch.reduce((acc, breadcrumbObj, breadcrumbIndex) => {
				acc[`${breadcrumbObj.message} ${breadcrumbIndex}`] = breadcrumbObj
				return acc
			}, {})
			addBreadcrumb('batched breadcrumb', breadcrumbsBatchObject)
			breadcrumbsBatch = []
		}
	}

	function getPhaseTime(time = Date.now()) {
		return time - requestStartTime
	}

	function reportPlatformEndEvent(errorName?: string, errorMessage?: string) {
		const platformEvents = eventsToBiRequestData(ssrPerformanceStore.getAllPlatformAppEvents())
		// these are not technically platform events, but we want to report them along with the platform events
		const fetchEvents = eventsToBiRequestData(ssrPerformanceStore.getAllResourceFetchEvents())

		return reportSsrBi({
			phaseName: 'platform_end',
			phaseTime: getPhaseTime(),
			...(errorName && { errorType: errorName }),
			...(errorMessage && { errorData: errorMessage }),
			requestData: platformEvents,
			requestFetchData: fetchEvents,
		})
	}

	function eventsToBiRequestData<T extends ResourceFetchPerformanceEvent | PlatformAppPerformanceEvent>(
		events: Array<T>
	): Array<T> {
		return events.map((event) => ({
			...event,
			startTime: getPhaseTime(event.startTime),
			...(event.endTime && { endTime: getPhaseTime(event.endTime) }),
			...(event.error && { error: event.error }),
		}))
	}

	function reportSsrBi({ requestData, requestFetchData, ...params }: BiSsrEvent) {
		return ssrBiLoggerFactory.logger().log({
			evid: 1205,
			...(requestData && { requestData: JSON.stringify(requestData) }),
			...(requestFetchData && { requestFetchData: JSON.stringify(requestFetchData) }),
			...params,
		})
	}

	return {
		updatePageId,
		updatePageNumber,
		updateApplicationsMetaSite,
		reportAsyncWithCustomKey: <T>(
			asyncMethod: () => Promise<T>,
			feature: string,
			methodName: string,
			key: string
		): Promise<T> => {
			// @ts-ignore FEDINF-1937 missing type
			interactionStarted(methodName, { customParam: { key } })
			return asyncMethod()
				.then((res): Promise<T> => {
					// @ts-ignore FEDINF-1937 missing type
					interactionEnded(methodName, { customParam: { key } })
					return Promise.resolve(res)
				})
				.catch((error) => {
					captureError(error, { tags: { feature, methodName } })
					return Promise.reject(error)
				})
		},
		runAsyncAndReport: async <T>(
			asyncMethod: () => Promise<T>,
			feature: string,
			methodName: string,
			reportExeception: boolean = true
		): Promise<T> => {
			try {
				interactionStarted(`${methodName}`)
				const fnResult = await asyncMethod()
				interactionEnded(`${methodName}`)
				return fnResult
			} catch (e) {
				if (reportExeception) {
					captureError(e, { tags: { feature, methodName } })
				}
				throw e
			}
		},
		runAndReport: <T>(method: () => T, feature: string, methodName: string): T => {
			interactionStarted(methodName)
			try {
				const t = method()
				interactionEnded(methodName)
				return t
			} catch (e) {
				captureError(e, { tags: { feature, methodName } })
				throw e
			}
		},
		captureError,
		setGlobalsForErrors: ({ tags = {}, extra = {} }) => {
			globalExtras = {
				...extra,
				...globalExtras,
			}
			globalTags = {
				...tags,
				...globalTags,
			}
		},
		breadcrumb,
		addBreadcrumbToBatch,
		flushBreadcrumbBatch,
		interactionStarted,
		interactionEnded,
		phaseStarted,
		phaseEnded,
		meter,
		reportAppLoadStarted: () => fedopsLogger.appLoadStarted(),
		appLoaded: (options?: Partial<IAppIdentifier>) => {
			ongoingfedops.phase = 'siteLoaded'
			if (!isSsr) {
				window.onoffline = () => {}
				window.ononline = () => {}
				// @ts-ignore
				removeEventListener('pagehide', window.fedops.pagehide)
			}
			// @ts-ignore it is possible to pass partial params.
			fedopsLogger.appLoaded(options)
			// TODO FEDINF-4745 fedops to report cwv metrics for appName if "reportBlackbox" is set to true
			if (!registerPlatformTenantsInvoked) {
				fedopsLogger.registerPlatformTenants(['thunderbolt'])
			}
		},
		registerPlatformWidgets: (widgetAppNames: Array<string>) => {
			registerPlatformTenantsInvoked = true
			fedopsLogger.registerPlatformTenants(['thunderbolt', ...widgetAppNames])
		},
		getEventsData: ssrPerformanceStore.getAllSSRPerformanceEvents,
		addSSRPerformanceEvents: (events: Array<ServerPerformanceEvent>) =>
			ssrPerformanceStore.addSSRPerformanceEvents(events),
		addPlatformAppEvent: (eventId: string, event: PlatformAppPerformanceEvent) =>
			ssrPerformanceStore.addPlatformAppEvent(eventId, event),
		finishPlatformAppEvent: (eventId: string, error?: string) =>
			ssrPerformanceStore.finishPlatformAppEvent(eventId, error),
		addResourceFetchEvent: (event: PlatformAppPerformanceEvent) => ssrPerformanceStore.addResourceFetchEvent(event),
		getAllResourceFetchEvents: () => ssrPerformanceStore.getAllResourceFetchEvents(),
		reportPlatformEndEvent,
		reportSsrBi,
	}
}
