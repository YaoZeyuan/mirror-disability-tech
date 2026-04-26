import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { TpaCommonsSiteConfig } from './types'
import type { ISessionManager } from 'feature-session-manager'
import { SessionManagerSymbol } from 'feature-session-manager'
import type { IStructureAPI, WixBiSession, ITpaSrcQueryParamProvider, ILogger } from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	CurrentRouteInfoSymbol,
	SiteFeatureConfigSymbol,
	StructureAPI,
	WixBiSessionSymbol,
	ConsentPolicySymbol,
	LoggerSymbol,
} from '@wix/thunderbolt-symbols'
import { name } from './symbols'
import _ from 'lodash'
import type { IConsentPolicy } from 'feature-consent-policy'
import type { PolicyDetails } from '@wix/cookie-consent-policy-client'
import type { ICommonConfig } from 'feature-common-config'
import { CommonConfigSymbol } from 'feature-common-config'
import type { ICurrentRouteInfo } from 'feature-router'

export const BaseTpaSrcQueryParamProvider = withDependencies(
	[named(SiteFeatureConfigSymbol, name)],
	(conf: TpaCommonsSiteConfig): ITpaSrcQueryParamProvider => ({
		getQueryParams({ compId, pageId, tpaCompData, options: { extraQueryParams } }) {
			const { siteRevision, editorOrSite, deviceType, locale, tpaDebugParams, timeZone, regionalLanguage } = conf
			const { templateId, width, height, isResponsive } = tpaCompData
			return {
				pageId,
				// when templateCompId exists, it should be the compId passed to the tpa e.g in case the controller lives within a shared block
				// compId is still needed for js-sdk
				compId: templateId || compId,
				viewerCompId: compId,
				siteRevision: `${siteRevision}`,
				viewMode: editorOrSite,
				deviceType,
				locale,
				tz: timeZone,
				regionalLanguage,
				width: !isResponsive && _.isNumber(width) ? `${width}` : null,
				height: !isResponsive && _.isNumber(height) ? `${height}` : null,
				...tpaDebugParams,
				...extraQueryParams,
			}
		},
	})
)

export const ExternalIdTpaSrcQueryParamProvider = withDependencies(
	[],
	(): ITpaSrcQueryParamProvider => ({
		getQueryParams({ tpaCompData }) {
			const { externalId } = tpaCompData
			return {
				externalId,
			}
		},
	})
)

export const InstanceTpaSrcQueryParamProvider = withDependencies(
	[named(SiteFeatureConfigSymbol, name), SessionManagerSymbol, LoggerSymbol],
	(
		{ widgetsClientSpecMapData }: TpaCommonsSiteConfig,
		sessionManager: ISessionManager,
		logger: ILogger
	): ITpaSrcQueryParamProvider => ({
		getQueryParams({ tpaCompData, options }) {
			const widgetCSMData = widgetsClientSpecMapData[tpaCompData.widgetId!] || {}
			const appDefinitionId = widgetCSMData.appDefinitionId || options.appDefinitionId || ''
			const instance = sessionManager.getAppInstanceByAppDefId(appDefinitionId)
			if (!instance) {
				const error = new Error('Did not get app instance')
				error.name = 'TpaMissingAppInstance'
				logger.captureError(error, {
					tags: { feature: 'feature-tpa-commons' },
					extra: { appDefinitionId },
				})
			}
			return { instance }
		},
	})
)

export const CurrencyTpaSrcQueryParamProvider = withDependencies(
	[named(SiteFeatureConfigSymbol, name), BrowserWindowSymbol] as const,
	(conf: TpaCommonsSiteConfig, browserWindow): ITpaSrcQueryParamProvider => ({
		getQueryParams() {
			const { requestUrl, extras } = conf
			const currentUrl = new URL(browserWindow?.location?.href || requestUrl)
			return {
				currency: extras.currency,
				currentCurrency: currentUrl.searchParams.get('currency') || extras.currency,
			}
		},
	})
)

export const BITpaSrcQueryParamProvider = withDependencies(
	[WixBiSessionSymbol],
	({ viewerSessionId }: WixBiSession): ITpaSrcQueryParamProvider => ({
		getQueryParams() {
			return { vsi: viewerSessionId }
		},
	})
)

export const ConsentPolicyTpaSrcQueryParamProvider = withDependencies(
	[ConsentPolicySymbol],
	(consentPolicyApi: IConsentPolicy): ITpaSrcQueryParamProvider => ({
		getQueryParams() {
			const consentPolicy = consentPolicyApi.getCurrentConsentPolicy()

			const isDefaultConsentPolicy = (policytoTest: PolicyDetails) =>
				policytoTest.defaultPolicy && _.every(policytoTest.policy)

			const policyValue =
				!isDefaultConsentPolicy(consentPolicy) && !!consentPolicyApi._getConsentPolicyHeader()['consent-policy']
					? decodeURIComponent(consentPolicyApi._getConsentPolicyHeader()['consent-policy']!)
					: undefined

			return {
				'consent-policy': policyValue,
			}
		},
	})
)

export const CommonConfigTpaSrcQueryParamProvider = withDependencies(
	[CommonConfigSymbol],
	(commonConfigAPI: ICommonConfig): ITpaSrcQueryParamProvider => ({
		getQueryParams() {
			return { commonConfig: JSON.stringify(commonConfigAPI.getCommonConfigForUrl()) }
		},
	})
)

export const RouteTpaSrcQueryParamProvider = withDependencies(
	[CurrentRouteInfoSymbol],
	(currentRouteInfo: ICurrentRouteInfo): ITpaSrcQueryParamProvider => ({
		getQueryParams() {
			const routerPublicData = currentRouteInfo.getCurrentRouteInfo()?.dynamicRouteData?.publicData
			const currentRoute = currentRouteInfo.getCurrentRouteInfo()?.relativeUrl
			let routerData = null
			if (routerPublicData) {
				const parsedRouterData = JSON.stringify(routerPublicData)
				routerData = parsedRouterData.length < 400 ? parsedRouterData : null
			}

			return {
				routerData,
				currentRoute,
			}
		},
	})
)

export const AppSectionTpaSrcQueryParamProvider = withDependencies(
	[named(SiteFeatureConfigSymbol, name), StructureAPI, BrowserWindowSymbol] as const,
	(siteConfig: TpaCommonsSiteConfig, structureApi: IStructureAPI, browserWindow): ITpaSrcQueryParamProvider => ({
		getQueryParams({ compId, tpaCompData, options }) {
			const { widgetsClientSpecMapData, appSectionParams, isMobileView, requestUrl, viewMode, externalBaseUrl } =
				siteConfig
			const resolveAppSectionParams = () => {
				if (browserWindow) {
					const json = new URL(browserWindow?.location?.href || requestUrl).searchParams.get('appSectionParams')
					return JSON.parse(json || '{}') || {}
				}
				return appSectionParams
			}

			const optionalParams: Record<string, string | null> = {
				target: null,
				'section-url': null,
			}

			if (tpaCompData.widgetId) {
				const { widgetUrl, mobileUrl } = widgetsClientSpecMapData[tpaCompData.widgetId!]
				const baseUrl = isMobileView ? mobileUrl || widgetUrl : widgetUrl
				const compType = structureApi.get(compId)?.componentType || ''
				const isSectionCompType = compType.toLowerCase().endsWith('section')
				// tpaCompData might belong to the parent TPA in case of tpaPopup/model (runtime comps) so we shouldn't rely on it
				if (tpaCompData.isSection && isSectionCompType) {
					if (viewMode === 'site') {
						optionalParams['section-url'] = `${externalBaseUrl}/${options.tpaInnerRouteConfig!.tpaPageUri}/`
						optionalParams.target = '_top'
					} else {
						optionalParams['section-url'] = baseUrl
						optionalParams.target = '_self'
					}
				}
			}

			return {
				...resolveAppSectionParams(),
				...optionalParams,
			}
		},
	})
)
