import _ from 'lodash'
import { getBrowserLanguage, getBrowserReferrer, getCSRFToken, isSSR } from '@wix/thunderbolt-commons'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	PlatformEnvData,
	PlatformEnvDataProvider,
	PlatformSiteConfig,
	ViewerModel,
} from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	CurrentRouteInfoSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
	ConsentPolicySymbol,
} from '@wix/thunderbolt-symbols'
import type { IConsentPolicy } from 'feature-consent-policy'
import type { ICurrentRouteInfo, IRoutingLinkUtilsAPI } from 'feature-router'
import { RoutingLinkUtilsAPISymbol } from 'feature-router'
import { name } from '../symbols'
import type { IProtectedPagesApi } from 'feature-protected-pages'
import { ProtectedPagesApiSymbol } from 'feature-protected-pages'

export const consentPolicyEnvDataProvider = withDependencies(
	[ConsentPolicySymbol],
	(consentPolicyApi: IConsentPolicy): PlatformEnvDataProvider => {
		return {
			platformEnvData() {
				return {
					consentPolicy: {
						details: consentPolicyApi.getCurrentConsentPolicy(),
						header: consentPolicyApi._getConsentPolicyHeader(),
					},
				}
			},
		}
	}
)

export const windowEnvDataProvider = withDependencies(
	[BrowserWindowSymbol, named(SiteFeatureConfigSymbol, name)],
	(window: BrowserWindow, platformSiteConfig: PlatformSiteConfig): PlatformEnvDataProvider => {
		const csrfToken = window
			? getCSRFToken(window!.document?.cookie)
			: platformSiteConfig.bootstrapData.window.csrfToken
		return {
			platformEnvData() {
				return {
					window: {
						isSSR: isSSR(window),
						browserLocale: getBrowserLanguage(window),
						csrfToken,
					},
				}
			},
		}
	}
)

export const documentEnvDataProvider = withDependencies(
	[BrowserWindowSymbol],
	(window: BrowserWindow): PlatformEnvDataProvider => ({
		platformEnvData() {
			return {
				document: {
					referrer: getBrowserReferrer(window),
				},
			}
		},
	})
)

export const routingEnvDataProvider = withDependencies(
	[RoutingLinkUtilsAPISymbol, CurrentRouteInfoSymbol, optional(ProtectedPagesApiSymbol)],
	(
		routingLinkUtilsAPI: IRoutingLinkUtilsAPI,
		currentRouteInfo: ICurrentRouteInfo,
		protectedPagesApi?: IProtectedPagesApi
	): PlatformEnvDataProvider => {
		return {
			platformEnvData() {
				const routeInfo = currentRouteInfo.getCurrentRouteInfo()
				const dynamicRouteData = routeInfo?.dynamicRouteData

				const routerEnvData: PlatformEnvData['router'] = {
					routingInfo: routingLinkUtilsAPI.getLinkUtilsRoutingInfo(),
					pageJsonFileName: routeInfo?.pageJsonFileName || '',
					isLandingOnProtectedPage: currentRouteInfo.isLandingOnProtectedPage(),
					protectedPages: protectedPagesApi?.getProtectedPages(),
				}

				if (dynamicRouteData) {
					routerEnvData.dynamicRouteData = _.pick(dynamicRouteData, ['pageData', 'pageHeadData', 'publicData'])
				}

				return {
					router: routerEnvData,
				}
			},
		}
	}
)

export const topologyEnvDataProvider = withDependencies(
	[ViewerModelSym],
	({ media }: ViewerModel): PlatformEnvDataProvider => {
		return {
			platformEnvData() {
				return {
					topology: {
						media,
					},
				}
			},
		}
	}
)

export const anywhereConfigEnvDataProvider = withDependencies(
	[ViewerModelSym],
	({ anywhereConfig }: ViewerModel): PlatformEnvDataProvider => {
		return {
			platformEnvData() {
				return {
					anywhereConfig,
				}
			},
		}
	}
)
