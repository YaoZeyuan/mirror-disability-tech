/**
 * This is a temporary fix to the issue described here:
 * https://wix.slack.com/archives/C9N00LLE6/p1741513471959229?thread_ts=1741261415.278429&cid=C9N00LLE6
 *
 * TL;DR when `thunderbolt-logger` adds `thunderbolt-commons` as dependency DM builds start to fail when bumping TB, because of a transitive dependency on 'path'.
 *
 * After the issue is fixed this file should be removed in favour of packages/thunderbolt-commons/src/monitoring.ts.
 */

import type { StackFrame, Event } from '@wix/fe-essentials-viewer-platform/sentry/types'

declare global {
	interface Window {
		wixEmbedsAPI: {
			getMonitoringConfig: (appId: string) => any
		}
	}
}

type AddRerouteDataToSentryEvent = (event: Event) => void
type IsSentryEventFromNonWixTpa = (event: Event) => boolean

type StackFrameWithPossibleModuleMetadata = StackFrame & {
	module_metadata?: any
}

const SENTRY_REROUTED_MARK_KEY = '_REROUTED'
const SENTRY_IS_NON_WIX_TPA_MARK_KEY = '_isTPA'
const SENTRY_REROUTE_DATA_KEY = '_ROUTE_TO'

export const addRerouteDataToSentryEvent: AddRerouteDataToSentryEvent = (event) => {
	if (event?.extra?.[SENTRY_REROUTE_DATA_KEY]) {
		return
	}

	if (event?.exception?.values?.[0].stacktrace?.frames) {
		const frames = event.exception.values[0].stacktrace.frames as Array<StackFrameWithPossibleModuleMetadata>

		// Find the last frame with module metadata containing an appId or dsn
		const framesModuleMetadata = frames
			.filter((frame) => frame.module_metadata && frame.module_metadata.appId)
			.map((v) => ({
				appId: v.module_metadata.appId,
				release: v.module_metadata.release,
				dsn: v.module_metadata.dsn,
			}))

		const routeTo = framesModuleMetadata.slice(-1) // using top frame only

		if (routeTo.length) {
			const appId = routeTo[0].appId
			const app = window.wixEmbedsAPI?.getMonitoringConfig(appId)

			if (app?.monitoringComponent?.monitoring?.type === 'SENTRY') {
				const dsn = app?.monitoringComponent?.monitoring?.sentryOptions?.dsn

				if (dsn) {
					if (!routeTo[0].dsn && dsn) {
						// Take the DSN from DC Monitoring component
						routeTo[0].dsn = dsn
					}
				}
			}

			if (app) {
				event.extra = {
					...event.extra,
					[SENTRY_IS_NON_WIX_TPA_MARK_KEY]: !app.isWixTPA,
				}
			}

			event.extra = {
				...event.extra,
				[SENTRY_REROUTE_DATA_KEY]: routeTo,
				[SENTRY_REROUTED_MARK_KEY]: true,
			}
		}
	}
}

export const isSentryEventFromNonWixTpa: IsSentryEventFromNonWixTpa = (event) => {
	return !!event?.extra?.[SENTRY_IS_NON_WIX_TPA_MARK_KEY]
}
