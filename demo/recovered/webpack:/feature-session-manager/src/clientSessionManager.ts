import _ from 'lodash'
import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type {
	ILogger,
	SdkHandlersProvider,
	BrowserWindow,
	DynamicSessionModel,
	ISessionProvider,
} from '@wix/thunderbolt-symbols'
import {
	SiteFeatureConfigSymbol,
	LoggerSymbol,
	BrowserWindowSymbol,
	FeatureExportsSymbol,
	METASITE_APP_DEF_ID,
	SessionProviderSymbol,
	SessionModelSymbol,
} from '@wix/thunderbolt-symbols'
import type {
	SessionManagerSiteConfig,
	ISessionManager,
	SessionHandlers,
	LoadNewSessionReason,
	OnLoadSessionCallback,
} from './types'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import type { sessionExportsNamespace } from './symbols'
import { name } from './symbols'
import { DEFAULT_EXPIRATION_TIME } from './constants'

export const SessionManager = withDependencies(
	[
		BrowserWindowSymbol,
		named(SiteFeatureConfigSymbol, name),
		LoggerSymbol,
		named(FeatureExportsSymbol, name),
		SessionProviderSymbol,
		SessionModelSymbol,
	],
	(
		browserWindow: BrowserWindow,
		siteFeatureConfig: SessionManagerSiteConfig,
		logger: ILogger,
		sessionExports: IFeatureExportsStore<typeof sessionExportsNamespace>,
		sessionProvider: ISessionProvider,
		boundSessionModel: Partial<DynamicSessionModel>
	): ISessionManager & SdkHandlersProvider<SessionHandlers> => {
		let sessionTimeoutPointer: number

		const isRunningInDifferentSiteContext = siteFeatureConfig.isRunningInDifferentSiteContext

		const onLoadSessionCallbacks: Set<OnLoadSessionCallback> = new Set()

		const addLoadNewSessionCallback = (callback: OnLoadSessionCallback) => {
			onLoadSessionCallbacks.add(callback)
			return () => onLoadSessionCallbacks.delete(callback)
		}

		const invokeSessionLoadCallbacks = (reason: LoadNewSessionReason) => {
			const { apps, siteMemberId, visitorId, svSession, smToken } = sessionModel
			const instances = _.mapValues(apps, 'instance')

			onLoadSessionCallbacks.forEach((callback) => {
				callback({
					results: { instances, siteMemberId, visitorId, svSession, smToken },
					reason,
				})
			})
		}

		const sessionModel: Partial<DynamicSessionModel> = {
			...(boundSessionModel || {}),
			...siteFeatureConfig.sessionModel,
			...sessionProvider.getCurrentSession(),
		}

		const metaSiteAppId = sessionModel.apps?.[METASITE_APP_DEF_ID]
		if (metaSiteAppId) {
			logger.updateApplicationsMetaSite(metaSiteAppId.instance)
		}
		invokeSessionLoadCallbacks('firstLoad')

		const getAllInstances = () => {
			return sessionModel.apps || {}
		}

		const getAppInstanceByAppDefId = (appDefId: string): string | undefined => {
			return getAllInstances()[appDefId]?.instance
		}

		const loadNewSession: ISessionManager['loadNewSession'] = async (options = { reason: 'noSpecificReason' }) => {
			try {
				const newSession = await sessionProvider.loadNewSession(options)
				Object.assign(sessionModel, newSession)
				invokeSessionLoadCallbacks(options.reason)
			} catch (error) {
				logger.captureError(new Error('failed loading new session'), {
					tags: { feature: 'session-manager' },
					extra: { errorMessage: error.message },
				})
			}
			setNextSessionRefresh()
		}

		const setNextSessionRefresh = () => {
			if (!isRunningInDifferentSiteContext) {
				setSessionTimeout()
			}
		}

		const setSessionTimeout = () => {
			if (sessionTimeoutPointer) {
				browserWindow!.clearTimeout(sessionTimeoutPointer)
			}

			sessionTimeoutPointer = browserWindow!.setTimeout(
				() => loadNewSession({ reason: 'expiry' }),
				siteFeatureConfig.expiryTimeoutOverride || DEFAULT_EXPIRATION_TIME
			)
		}
		const getVisitorId = () => sessionModel.visitorId

		sessionExports.export({
			getVisitorId,
			getAppInstanceByAppDefId,
		})

		// set initial timeout / message registrar for refresh
		setNextSessionRefresh()

		return {
			getAllInstances,
			getAppInstanceByAppDefId,
			getAccessTokenByAppDefId: getAppInstanceByAppDefId,
			getSiteMemberId() {
				return sessionModel.siteMemberId
			},
			getSmToken() {
				return sessionModel.smToken
			},
			getVisitorId,
			loadNewSession,
			addLoadNewSessionCallback,
			getHubSecurityToken() {
				return String(sessionModel.hs || 'NO_HS')
			},
			getUserSession() {
				return sessionModel.svSession
			},
			getCtToken() {
				return sessionModel.ctToken
			},
			setUserSession(svSession: string) {
				sessionModel.svSession = svSession
				// invokeSessionLoadCallbacks('newUserSession') // TODO potential breaking change, deserves it's own commit
			},
			getSdkHandlers: () => ({
				getMediaAuthToken: () => Promise.resolve(sessionModel.mediaAuthToken),
				loadNewSession,
				addLoadNewSessionCallback: async (callback) => addLoadNewSessionCallback(callback),
			}),
			getContactId() {
				return sessionModel.contactId
			},
			getBoundAccessTokenFunction: (appDefId: string) => {
				return async () => {
					const appToken = getAppInstanceByAppDefId(appDefId)
					return appToken || ''
				}
			},
		}
	}
)
