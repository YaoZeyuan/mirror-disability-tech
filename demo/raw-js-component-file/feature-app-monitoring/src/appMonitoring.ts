import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { BrowserWindowSymbol, SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { name } from './symbols'
import type { AppMonitoringApi, AppMonitoringSiteConfig } from './types'
import { getMonitoringClientFunction } from '@wix/monitoring-browser-sdk-host'
import type { HostMonitoringContext } from '@wix/monitoring-types'
import { addRerouteDataToSentryEvent, isSentryEventFromNonWixTpa } from '@wix/thunderbolt-commons'

const getHostMonitoringContext = ({
	appId,
	metaSiteId,
	siteUrl,
}: {
	appId: string
	metaSiteId?: string
	siteUrl?: string
}): HostMonitoringContext => ({
	appId,
	platform: 'SITE_VIEWER',
	tenantType: 'SITE',
	tenantId: metaSiteId,
	siteUrl,
})

/**
 * This is a feature.
 * You can get your configuration from site-assets and viewer-model injected into your feature
 */
export const AppMonitoring = withDependencies<AppMonitoringApi>(
	[named(SiteFeatureConfigSymbol, name), BrowserWindowSymbol],
	(siteFeatureConfig: AppMonitoringSiteConfig, window) => {
		const getMonitoringConfig = (appId: string) =>
			siteFeatureConfig.appsWithMonitoring.find((app) => app.appId === appId)

		return {
			featureName: name,
			addRerouteDataToSentryEvent,
			getMonitoringClientFunction: ({ appId, metaSiteId, siteUrl }) => {
				const config = getMonitoringConfig(appId)

				return getMonitoringClientFunction({
					monitoringConfig: config?.monitoringComponent?.monitoring,
					hostContext: getHostMonitoringContext({ appId, metaSiteId, siteUrl }),
					sentrySDK: window.Sentry,
					sentryTransport: siteFeatureConfig.sentryTransport,
				})
			},
			getMonitoringConfig,
			isSentryEventFromNonWixTpa,
		}
	}
)
