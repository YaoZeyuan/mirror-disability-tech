import type { Event, EventHint } from '@wix/fe-essentials-viewer-platform/sentry/types'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { PanoramaSdkHandlers, SdkHandlersProvider } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, ExperimentsSymbol } from '@wix/thunderbolt-symbols'
import type { AppMonitoringApi } from 'feature-app-monitoring'
import { AppMonitoringSymbol } from 'feature-app-monitoring'

export const panoramaSdkHandlersProvider = withDependencies(
	[BrowserWindowSymbol, AppMonitoringSymbol, ExperimentsSymbol] as const,
	(window, appMonitoringApi: AppMonitoringApi, experiments): SdkHandlersProvider<PanoramaSdkHandlers> => {
		const processEvent = (event: Event, hint: EventHint, handler: (error: Error) => void) => {
			// Do nothing if the error originated from an external app
			if (appMonitoringApi.isSentryEventFromNonWixTpa(event)) {
				return event
			}

			const exceptions = event.exception?.values ?? []

			// Do nothing if the error is handled
			if (exceptions[0]?.mechanism?.handled) {
				if (event?.tags?.dontReportIfPanoramaEnabled) {
					return null
				}

				return event
			}

			// Propagate the unhandled error to the worker so it can be routed by Panorama
			if (hint.originalException && typeof hint.originalException === 'object') {
				handler(hint.originalException)
				return null
			}

			return event
		}

		return {
			getSdkHandlers: () => ({
				panorama: {
					onUnhandledError: (handler: (error: Error) => void) => {
						if (experiments['specs.thunderbolt.loadNewerSentrySdk']) {
							window.addEventListener('sentry-error', (e) => {
								const { sentryEvent, sentryHint } = (e as CustomEvent).detail ?? {}

								const res = processEvent(sentryEvent, sentryHint, handler)

								if (res === null) {
									e.preventDefault()
								}
							})
						} else {
							window.Sentry.onLoad(() =>
								window.Sentry.addGlobalEventProcessor((event, hint) => processEvent(event, hint, handler))
							)
						}
					},
					onBreadcrumb: (handler: (breadcrumb: any) => void) => {
						window.onBeforeSentryBreadcrumb = handler
					},
				},
			}),
		}
	}
)
