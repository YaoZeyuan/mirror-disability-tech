import { withDependencies, named, optional } from '@wix/thunderbolt-ioc'
import type {
	IAppWillMountHandler,
	BrowserWindow,
	ViewerModel,
	ILanguage,
	Experiments,
	ILogger,
	WixEmbedsAPI,
} from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	ViewerModelSym,
	FeatureStateSymbol,
	LanguageSymbol,
	CurrentRouteInfoSymbol,
	SiteFeatureConfigSymbol,
	ExperimentsSymbol,
	LoggerSymbol,
} from '@wix/thunderbolt-symbols'
import type { ISiteMembersApi } from 'feature-site-members'
import { SiteMembersApiSymbol } from 'feature-site-members'
import type { AppMonitoringApi } from 'feature-app-monitoring'
import { AppMonitoringSymbol } from 'feature-app-monitoring'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { ISessionManager } from 'feature-session-manager'
import { SessionManagerSymbol } from 'feature-session-manager'
import type { WixEmbedsAPISiteConfig, WixEmbedsAPIFeatureState } from './types'

import type { ICurrentRouteInfo } from 'feature-router'

import { name } from './symbols'
import { generateWixEmbedsAPI } from './api'

const wixEmbedsApiSiteFactory = (
	config: WixEmbedsAPISiteConfig,
	featureState: IFeatureState<WixEmbedsAPIFeatureState>,
	sessionManager: ISessionManager,
	window: NonNullable<BrowserWindow>,
	viewerModel: ViewerModel,
	language: ILanguage,
	currentRouteInfo: ICurrentRouteInfo,
	logger: ILogger,
	experiments: Experiments,
	appMonitoring: AppMonitoringApi,
	siteMembersApi?: ISiteMembersApi
): IAppWillMountHandler => {
	return {
		async appWillMount() {
			const state: WixEmbedsAPIFeatureState = { listeners: {}, firstMount: true }
			featureState.update(() => state)

			const { site } = viewerModel
			const api: WixEmbedsAPI = generateWixEmbedsAPI({
				window,
				site,
				language,
				currentRouteInfo,
				config,
				state,
				siteMembersApi,
				sessionManager,
				logger,
				experiments,
				appMonitoring,
			})

			const customEventEmbedIsReady = async () => {
				// Both currentRouteInfo and wixEmbedsAPI are running in appWillMount and we need
				// to make sure that wixEmbedsAPI is ready after currentRouteInfo for other clients that needs the router to have a page id.
				const event = new Event('wixEmbedsAPIReady', { bubbles: true, cancelable: false })
				// since react umd bundles do not define named modules, we must load react before potentially loading requirejs.
				// further details here: https://requirejs.org/docs/errors.html#mismatch
				await window.reactAndReactDOMLoaded

				window.dispatchEvent(event)
			}

			Object.defineProperty(window, 'wixEmbedsAPI', {
				value: Object.freeze(api),
				writable: false,
				configurable: false,
				enumerable: true,
			})

			currentRouteInfo.onRouterInitDone(customEventEmbedIsReady)
		},
	}
}

export const WixEmbedsApiSite = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		named(FeatureStateSymbol, name),
		SessionManagerSymbol,
		BrowserWindowSymbol,
		ViewerModelSym,
		LanguageSymbol,
		CurrentRouteInfoSymbol,
		LoggerSymbol,
		ExperimentsSymbol,
		AppMonitoringSymbol,
		optional(SiteMembersApiSymbol),
	],
	wixEmbedsApiSiteFactory
)
