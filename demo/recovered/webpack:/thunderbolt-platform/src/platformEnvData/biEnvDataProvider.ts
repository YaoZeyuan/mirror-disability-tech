import _ from 'lodash'
import { isSSR } from '@wix/thunderbolt-commons'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	Experiments,
	PlatformEnvData,
	PlatformEnvDataProvider,
	PlatformSiteConfig,
	ViewerModel,
	WixBiSession,
} from '@wix/thunderbolt-symbols'
import {
	AppNameSymbol,
	BrowserWindowSymbol,
	ExperimentsSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
	WixBiSessionSymbol,
} from '@wix/thunderbolt-symbols'
import type { IUrlHistoryManager } from 'feature-router'
import { UrlHistoryManagerSymbol } from 'feature-router'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'
import { name } from '../symbols'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'

export const biEnvDataProvider = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		BrowserWindowSymbol,
		WixBiSessionSymbol,
		ViewerModelSym,
		UrlHistoryManagerSymbol,
		AppNameSymbol,
		optional(LightboxUtilsSymbol),
		NavigationManagerSymbol,
		ExperimentsSymbol,
	],
	(
		platformSiteConfig: PlatformSiteConfig,
		window: BrowserWindow,
		wixBiSession: WixBiSession,
		viewerModel: ViewerModel,
		urlHistoryManager: IUrlHistoryManager,
		appName: string,
		lightboxUtils: ILightboxUtils,
		navigateManager: INavigationManager,
		experiments: Experiments
	): PlatformEnvDataProvider => {
		let pageNumber = 0
		const { mode, rollout, fleetConfig } = viewerModel
		const bi = {
			..._.omit(wixBiSession, 'checkVisibility', 'msId'),
			viewerVersion:
				!process.env.browser || process.env.RENDERER_BUILD === 'react-native'
					? (process.env.APP_VERSION as string)
					: window!.thunderboltVersion,
			rolloutData: rollout,
			fleetConfig,
		}

		return {
			platformEnvData(pageOrPopupId?: string | undefined): { bi: PlatformEnvData['bi'] } {
				const { href, searchParams } = urlHistoryManager.getParsedUrl()

				const suppressBi =
					(process.env.NODE_ENV === 'development' && !searchParams.has('forceReport')) ||
					(searchParams.has('suppressbi') && searchParams.get('suppressbi') !== 'false')

				if (!pageOrPopupId) {
					// TODO: Maybe we can have a single return and set the defaults on it?
					// platform init
					return {
						bi: {
							...bi,
							appName,
							// @ts-ignore
							pageData: {
								pageNumber: navigateManager.isFirstNavigation() ? 1 : pageNumber,
							},
							// @ts-ignore
							rolloutData: {},
							// @ts-ignore
							fleetConfig: {},
							muteFedops: mode.qa || suppressBi,
						},
					}
				}

				const isLightbox = lightboxUtils?.isLightbox(pageOrPopupId)

				if (!isLightbox) {
					pageNumber++
				}

				const biPageData = {
					pageNumber,
					pageId: pageOrPopupId,
					pageUrl: href,
					isLightbox,
				}

				const muteBi = isSSR(window) || mode.qa || suppressBi
				const shouldSendBiInLightBox = experiments['specs.thunderbolt.sendBiInlightbox']
				const muteFedops = mode.qa || suppressBi || (shouldSendBiInLightBox ? false : isLightbox)

				return {
					bi: {
						...platformSiteConfig.bootstrapData.bi,
						...bi,
						pageData: biPageData,
						muteBi,
						muteFedops,
						appName,
						isSuccessfulSSR: wixBiSession.isSuccessfulSSR,
					},
				}
			},
		}
	}
)
