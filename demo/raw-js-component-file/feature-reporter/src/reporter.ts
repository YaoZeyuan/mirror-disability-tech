import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { IReporterApi, ReporterSiteConfig } from './types'
import type { RegisterEventListener, TrackEvent } from '@wix/thunderbolt-symbols'
import type { ISessionManager } from 'feature-session-manager'
import { SessionManagerSymbol } from 'feature-session-manager'

import { name } from './symbols'
import { SiteFeatureConfigSymbol, FeatureExportsSymbol } from '@wix/thunderbolt-symbols'
import { enrichEventOptions } from './event-options'
import { resolveEventParams } from './resolve-event-params'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import { yieldToMain } from '@wix/thunderbolt-commons'

const reporterFactory = (
	siteConfig: ReporterSiteConfig,
	sessionManager: ISessionManager,
	reporterExports: IFeatureExportsStore<typeof name>
): IReporterApi => {
	const trackEvent: TrackEvent = async (
		event,
		{ reportToChannelsOnly, reportToListenersOnly, reportToEssentialsOnly } = {}
	) => {
		await yieldToMain()
		const { eventName, params = {}, options = {} } = event
		const eventParams = resolveEventParams(params as Record<string, string>, sessionManager)
		const eventOptions = enrichEventOptions(options, siteConfig)
		const api = await import('./api' /* webpackChunkName: "reporter-api" */)

		if (reportToListenersOnly) {
			return api.trackEventToListenersOnly(eventName, eventParams, eventOptions)
		}

		if (reportToEssentialsOnly) {
			return api.trackEventToEssentialsOnly(eventName, eventParams, eventOptions)
		}

		if (reportToChannelsOnly) {
			api.trackEventToChannelsOnly(eventName, eventParams, eventOptions)
		} else {
			api.trackEvent(eventName, eventParams, eventOptions)
		}
	}

	const register: RegisterEventListener = async (listener) => {
		const api = await import('./api' /* webpackChunkName: "reporter-api" */)
		return api.getRegister()(listener)
	}

	reporterExports.export({ trackEvent, register })
	return { trackEvent, register }
}

export const Reporter = withDependencies(
	[named(SiteFeatureConfigSymbol, name), SessionManagerSymbol, named(FeatureExportsSymbol, name)],
	reporterFactory
)
