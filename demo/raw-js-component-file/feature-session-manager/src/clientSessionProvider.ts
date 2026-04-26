import { named, withDependencies } from '@wix/thunderbolt-ioc'
import {
	DynamicModelSymbol,
	FetchAccessTokensSymbol,
	LoggerSymbol,
	BrowserWindowSymbol,
	ExperimentsSymbol,
	SiteFeatureConfigSymbol,
} from '@wix/thunderbolt-symbols'
import type {
	ILogger,
	DynamicSessionModel,
	FetchDynamicModel,
	ISessionProvider,
	BrowserWindow,
	Experiments,
} from '@wix/thunderbolt-symbols'
import { name } from './symbols'
import type { SessionManagerSiteConfig } from './types'

export const ClientSessionProvider = withDependencies(
	[
		DynamicModelSymbol,
		FetchAccessTokensSymbol,
		LoggerSymbol,
		BrowserWindowSymbol,
		ExperimentsSymbol,
		named(SiteFeatureConfigSymbol, name),
	],
	(
		dynamicModel: DynamicSessionModel,
		fetchAccessTokens: FetchDynamicModel,
		logger: ILogger,
		browserWindow: BrowserWindow,
		experiments: Experiments,
		{ sessionModel: { metaSiteId } }: SessionManagerSiteConfig
	): ISessionProvider => {
		let currentSession: Partial<DynamicSessionModel> = dynamicModel

		const reloadIfDynamicModelMetaSiteIdMismatch = (responseMetaSiteId: string | undefined) => {
			if (!responseMetaSiteId || metaSiteId === responseMetaSiteId) {
				return false
			}

			// log because it's an error
			logger.captureError(new Error('Dynamic model metaSiteId mismatch'), {
				tags: {
					feature: 'session-manager',
					dynamicModelMetaSiteIdMismatch: true,
				},
				extra: {
					metaSiteId,
					responseMetaSiteId,
				},
				level: 'warning',
			})

			return true
		}

		return {
			getCurrentSession: () => {
				return currentSession
			},
			loadNewSession: async ({ authorizationCode }) => {
				try {
					currentSession = await fetchAccessTokens({
						credentials: 'same-origin',
						...(authorizationCode && { headers: { authorization: authorizationCode } }),
					})

					const isReloadOnMismatchOn = !!experiments['specs.thunderbolt.reloadOnDynamicModelMetaSiteIdMismatch']
					const responseMetaSiteId = currentSession.metaSiteId

					if (
						isReloadOnMismatchOn &&
						!authorizationCode &&
						reloadIfDynamicModelMetaSiteIdMismatch(responseMetaSiteId)
					) {
						if (browserWindow?.location) {
							browserWindow.location.reload()
						}
					}

					return currentSession
				} catch (error) {
					logger.captureError(new Error('failed fetching dynamicModel'), {
						tags: { feature: 'session-manager', fetchFail: 'dynamicModel' },
						extra: { errorMessage: error.message },
					})
					throw error
				}
			},
		}
	}
)
