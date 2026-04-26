import type { ISiteMembersApi, LoginOptions } from 'feature-site-members'
import type { WixEmbedsAPIFeatureState, WixEmbedsAPISiteConfig } from './types'
import { LoginErrorDetails } from './types'
import type { ISessionManager } from 'feature-session-manager'
import type { ICurrentRouteInfo } from 'feature-router'
import type { BrowserWindow, Experiments, ILogger, ViewerModel, WixEmbedsAPI } from '@wix/thunderbolt-symbols'
import type { AppMonitoringApi } from 'feature-app-monitoring'

type WixEmbedsAPIFactory = {
	window: NonNullable<BrowserWindow>
	site: ViewerModel['site']
	language: ViewerModel['language']
	currentRouteInfo: ICurrentRouteInfo
	config: WixEmbedsAPISiteConfig
	state: WixEmbedsAPIFeatureState
	siteMembersApi?: ISiteMembersApi
	sessionManager: ISessionManager
	logger: ILogger
	experiments: Experiments
	appMonitoring: AppMonitoringApi
}

const SECURITY_ERROR_TYPE = 'security_overrideGlobals'

export const generateWixEmbedsAPI = ({
	window,
	site,
	language,
	currentRouteInfo,
	config,
	state,
	siteMembersApi,
	sessionManager,
	logger,
	appMonitoring,
}: WixEmbedsAPIFactory): WixEmbedsAPI => {
	const callbacksFor = (eventName: string) => state.listeners[eventName] || []
	const getMetaSiteId = () => site.metaSiteId
	const getExternalBaseUrl = () => site.externalBaseUrl

	const api: WixEmbedsAPI = {
		getMetaSiteId,
		getHtmlSiteId: () => site.siteId,
		getExternalBaseUrl,
		isWixSite: () => site.siteType === 'WixSite',
		getLanguage: () => language.siteLanguage,
		getCurrentPageInfo: () => {
			return {
				id: currentRouteInfo.getCurrentRouteInfo()?.pageId,
				type: config.isAdminPage ? 'admin' : 'site',
			}
		},
		getMonitoringClientFunction: (appId) =>
			appMonitoring.getMonitoringClientFunction({
				appId,
				metaSiteId: getMetaSiteId(),
				siteUrl: getExternalBaseUrl(),
			}),
		getMonitoringConfig: (appId) => appMonitoring.getMonitoringConfig(appId),
		registerToEvent(eventName: string, callback: Function) {
			state.listeners[eventName] = callbacksFor(eventName)
			state.listeners[eventName].push(callback)
		},
		unregisterFromEvent(eventName: string, callback: Function) {
			state.listeners[eventName] = [...callbacksFor(eventName)].filter((func) => func !== callback)
		},
		promptLogin({
			onSuccess = () => {},
			onError = () => {},
			modal,
			mode,
		}: Partial<LoginOptions> & { onSuccess: any; onError: any }) {
			if (siteMembersApi) {
				siteMembersApi.registerToUserLogin(async () => {
					const member = await siteMembersApi.getMemberDetails()
					onSuccess({
						member: {
							memberId: member?.id,
							isOwner: member?.owner,
							role: member?.role,
						},
					})
				})
				siteMembersApi.promptLogin({ modal, mode })
			} else {
				onError({ reason: LoginErrorDetails.missingMembersArea })
			}
		},
		getSkipToMainContentButtonSelector: () => '#SKIP_TO_CONTENT_BTN',
		getMainContentElementSelector: () => '#PAGES_CONTAINER',
	}

	api.getAccessTokenFunction = () => {
		const tagManager = window.wixTagManager
		// @ts-ignore Todo: remove this ignore when tag manager is defined and removing experiment
		if (tagManager && tagManager.getAppId) {
			// @ts-ignore Todo: remove this ignore when tag manager is defined and removing experiment
			const appIdResult = tagManager.getAppId()

			if (typeof appIdResult === 'string') {
				// Returning a func that is only visible to the closure returning it with the app id
				return async () => await sessionManager.getAppInstanceByAppDefId(appIdResult)
			} else {
				const error = new Error('TB004')
				logger.meter(`${SECURITY_ERROR_TYPE}_${error.message}`, {
					paramsOverrides: {
						errorType: SECURITY_ERROR_TYPE,
						eventString: error.message,
					},
				})

				if (window?.viewerModel?.mode.debug) {
					console.error(appIdResult)
				}
			}
		} else {
			const error = new Error('TB005')
			logger.meter(`${SECURITY_ERROR_TYPE}_${error.message}`, {
				paramsOverrides: {
					errorType: SECURITY_ERROR_TYPE,
					eventString: error.message,
				},
			})
		}
	}

	return api
}
