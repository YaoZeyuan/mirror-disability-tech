import type { Experiments, ILogger, IReporterApi } from '@wix/thunderbolt-symbols'
import { getTrackEventParams, TRACK_EVENTS } from './constants'
import type { CombinedCollectionSettings, ICaptchaSettings, IDPConnection, ISiteMembersSettings } from './types'
import type { getPerformFetch } from './utils'
import { getCaptchaSettings } from './utils'

export const SiteMembersSettingsService = (
	performFetch: ReturnType<typeof getPerformFetch>,
	logger: ILogger,
	reporter: IReporterApi,
	experiments: Experiments,
	getInstance: () => string,
	clientId?: string
) => {
	let combinedCollectionSettings: CombinedCollectionSettings | undefined

	const collectionSettingsUrl = '/_serverless/collection-settings-facade/get-settings'
	const shouldSendCookiesForSiteMembersSettings =
		experiments['specs.thunderbolt.shouldSendCookiesForSiteMembersSettings']

	const getCombinedCollectionSettings = async (): Promise<CombinedCollectionSettings> => {
		if (combinedCollectionSettings) {
			return combinedCollectionSettings
		}

		const fetchUrl = clientId ? `${collectionSettingsUrl}?clientId=${clientId}` : collectionSettingsUrl

		const perCallOptions: Partial<RequestInit> = {
			headers: {
				'Content-Type': 'application/json',
				authorization: getInstance(),
			},
		}

		if (!shouldSendCookiesForSiteMembersSettings) {
			perCallOptions.credentials = 'omit'
		}

		return performFetch(fetchUrl, perCallOptions).then((settings: CombinedCollectionSettings) => {
			combinedCollectionSettings = settings
			return combinedCollectionSettings
		})
	}

	const getSiteMembersSettings = async (): Promise<ISiteMembersSettings> =>
		getCombinedCollectionSettings().then((settings) => settings.collectionSettings)

	return {
		getCombinedCollectionSettings,
		getSiteMembersSettings,
		getCaptchaSettings: (): Promise<ICaptchaSettings> => {
			return getSiteMembersSettings()
				.then(getCaptchaSettings)
				.catch((error) => {
					logger.captureError(error as Error, { tags: { feature: 'site-members' } })
					reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.SETTINGS.FAIL))
					return {
						invisible: { login: false, signup: false },
						visible: { login: false, signup: true },
					}
				})
		},
		getEnabledConnections: (overrides: Record<string, boolean>): Promise<Array<IDPConnection>> => {
			return getCombinedCollectionSettings().then(
				(settings) => settings.enabledConnections.filter(({ appDefId }) => overrides[appDefId] !== false) ?? []
			)
		},
		getLoginRedirectUrl: (): Promise<string> => {
			return getCombinedCollectionSettings().then((settings) => settings.loginUrl)
		},
		getLogoutRedirectUrl: (): Promise<string> => {
			return getCombinedCollectionSettings().then((settings) => settings.logoutUrl)
		},
	}
}
