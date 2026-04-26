import type { IFeatureState } from 'thunderbolt-feature-state'
import { LoginTypes } from './types'
import type { ProtectedPagesState, PagesMap, ProtectedPageMasterPageConfig, ProtectedPagesSiteConfig } from './types'
import type { CandidateRouteInfo, ICurrentRouteInfo, IRouter } from 'feature-router'
import { Router } from 'feature-router'
import type { AuthenticationResult, ISiteMembersApi } from 'feature-site-members'
import { SiteMembersApiSymbol, AUTH_RESULT_REASON } from 'feature-site-members'
import type { IPasswordProtectedPageApi } from 'feature-password-protected-page'
import { PasswordProtectedPageApiSymbol } from 'feature-password-protected-page'
import type { ISeoSiteApi } from 'feature-seo'
import { SeoSiteSymbol } from 'feature-seo'
import type { BrowserWindow, ILogger, IAppWillMountHandler, Experiments } from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	FeatureStateSymbol,
	LoggerSymbol,
	MasterPageFeatureConfigSymbol,
	CurrentRouteInfoSymbol,
	ExperimentsSymbol,
	SiteFeatureConfigSymbol,
} from '@wix/thunderbolt-symbols'
import { withDependencies, named, optional } from '@wix/thunderbolt-ioc'
import { name } from './symbols'

const PROTECTED_PAGES_SESSION_KEY = 'protectedPagesMap'

const protectedPagesLoginAndNavigate = (
	featureState: IFeatureState<ProtectedPagesState>,
	{ publicPageIds, pageUriSeoToRouterPrefix }: ProtectedPagesSiteConfig,
	{ customNoPermissionsPageUriSeo, customNoPermissionsPageId }: ProtectedPageMasterPageConfig,
	router: IRouter,
	currentRouteInfo: ICurrentRouteInfo,
	siteMembersApi: ISiteMembersApi,
	passwordProtectedPageApi: IPasswordProtectedPageApi,
	seoApi: ISeoSiteApi,
	logger: ILogger,
	experiments: Experiments,
	browserWindow: BrowserWindow
): IAppWillMountHandler => {
	const shouldPersistPagesMap = !!experiments['specs.thunderbolt.allowMpaForPasswordProtectedPages']

	const persistPagesMap = (pagesMap: PagesMap) => {
		if (!shouldPersistPagesMap) {
			return
		}
		try {
			browserWindow?.sessionStorage.setItem(PROTECTED_PAGES_SESSION_KEY, JSON.stringify(pagesMap))
		} catch {
			// sessionStorage may be unavailable (e.g. private browsing quota exceeded)
		}
	}

	const restorePagesMap = (): PagesMap => {
		if (!shouldPersistPagesMap) {
			return {}
		}
		try {
			const stored = browserWindow?.sessionStorage.getItem(PROTECTED_PAGES_SESSION_KEY)
			return stored ? JSON.parse(stored) : {}
		} catch {
			return {}
		}
	}

	const doSiteMembersLogin = async () => {
		let result
		if (siteMembersApi) {
			if (experiments['specs.thunderbolt.newAuthorizedPagesFlow']) {
				result = await siteMembersApi.requestAuthorizedPages()
				if (result.success) {
					return {
						// the version of TS on CI doesn't recognize that if `result.success` is true
						// then `result.pages` is of the correct type. Hopefully we can remove this
						// ignore soon
						// @ts-ignore
						authorizedPagesMap: result.pages,
						onProtectedPageNavigationComplete: async () => {
							if (process.env.browser) {
								// reset the title
								window.document.title = await seoApi.getPageTitle()
							}
						},
					}
				}
			} else {
				result = await siteMembersApi.requestAuthentication({})
				if (result.success) {
					return {
						authorizedPagesMap: await siteMembersApi.authorizeMemberPagesByToken(result.token!),
					}
				}
			}
		}

		return { authorizedPagesMap: {}, authenticationResult: result }
	}

	const doPasswordEnter = async (pageId: string) => {
		if (passwordProtectedPageApi) {
			return passwordProtectedPageApi.promptPagePasswordDialog(pageId)
		}

		return {
			authorizedPagesMap: {},
		}
	}

	const doLogin = async (
		loginType: LoginTypes,
		pageId: string
	): Promise<{
		authorizedPagesMap: PagesMap
		authenticationResult?: AuthenticationResult
		onProtectedPageNavigationComplete?: () => void
	}> => {
		return loginType === LoginTypes.SM ? doSiteMembersLogin() : doPasswordEnter(pageId)
	}

	const loginTypeToBiPageTypeMap = {
		[LoginTypes.Pass]: 'password-protected',
		[LoginTypes.SM]: 'protected',
		[LoginTypes.NONE]: undefined,
	} as const

	const navigateToPage = async (route: string, loginType: LoginTypes) =>
		router.navigate(route, {
			biData: {
				pageType: loginTypeToBiPageTypeMap[loginType],
			},
		})

	const navigateToPageWithNoPermissions = async (
		routeInfo: Partial<CandidateRouteInfo>,
		loginType: LoginTypes,
		isCustomNoPermissionsAllowed: boolean = false
	): Promise<boolean> => {
		if (customNoPermissionsPageUriSeo && isCustomNoPermissionsAllowed) {
			const routerPrefix = pageUriSeoToRouterPrefix[customNoPermissionsPageUriSeo]
				? `./${pageUriSeoToRouterPrefix[customNoPermissionsPageUriSeo]}/`
				: './'
			const customNoPermissionsPageUrl = `${routerPrefix}${customNoPermissionsPageUriSeo}`
			const appSectionParams = encodeURIComponent(
				JSON.stringify({
					restrictedPageId: routeInfo.pageId!,
					restrictedPagePath: (routeInfo.relativeEncodedUrl ?? '').replace('./', '/'),
				})
			)
			return navigateToPage(`${customNoPermissionsPageUrl}?appSectionParams=${appSectionParams}`, loginType)
		}
		if (siteMembersApi && loginType === 'SM') {
			const onCloseCallback = () => {
				if (currentRouteInfo.isLandingOnProtectedPage()) {
					navigateToPage('./', loginType)
				}
			}
			siteMembersApi.showNoPermissionsToPageDialog(onCloseCallback)
			return false
		}

		return currentRouteInfo.isLandingOnProtectedPage() ? navigateToPage('./', loginType) : false
	}

	async function authenticateUsingSitePassword(routeInfo: Partial<CandidateRouteInfo>, loginType: LoginTypes) {
		if (!passwordProtectedPageApi) {
			return
		}

		const { authorizedPagesMap, onComplete } = await passwordProtectedPageApi.promptSitePasswordDialog()

		const updatedPagesMap = Object.assign(featureState.get().pagesMap, authorizedPagesMap)
		persistPagesMap(updatedPagesMap)
		featureState.update((state) => ({
			...state,
			pagesMap: updatedPagesMap,
			completedSitePasswordAuth: true,
		}))

		await navigateToPage(routeInfo.parsedUrl!.href, loginType)
		onComplete?.()
	}

	const loginAndNavigate: ProtectedPagesState['loginAndNavigate'] = async (routeInfo, loginType) => {
		const pageId = routeInfo.pageId!
		try {
			const { authorizedPagesMap, authenticationResult, onProtectedPageNavigationComplete } = await doLogin(
				loginType,
				pageId
			)

			const updatedLoginPagesMap = Object.assign(featureState.get().pagesMap, authorizedPagesMap)
			persistPagesMap(updatedLoginPagesMap)
			featureState.update((state) => ({
				...state,
				pagesMap: updatedLoginPagesMap,
			}))

			if (authenticationResult?.reason === AUTH_RESULT_REASON.CANCELED) {
				return currentRouteInfo.isLandingOnProtectedPage() ? navigateToPage('./', loginType) : false
			}

			if (authorizedPagesMap[pageId]) {
				const didNavigate = await navigateToPage(routeInfo.parsedUrl!.href, loginType)
				onProtectedPageNavigationComplete?.()
				return didNavigate
			} else {
				const isCustomNoPermissionsPagePublic = publicPageIds.includes(customNoPermissionsPageId)
				const isUserAuthorizedForCustomNoPermissionsPage = Boolean(
					featureState.get().pagesMap[customNoPermissionsPageId]
				)
				const isCustomNoPermissionsPageAllowed =
					isCustomNoPermissionsPagePublic || isUserAuthorizedForCustomNoPermissionsPage

				return navigateToPageWithNoPermissions(routeInfo, loginType, isCustomNoPermissionsPageAllowed)
			}
		} catch (err) {
			logger.captureError(err, { tags: { feature: 'protectedPage' } })
			return navigateToPageWithNoPermissions(routeInfo, loginType)
		}
	}

	featureState.update(() => ({
		loginAndNavigate,
		authenticateUsingSitePassword,
		completedSitePasswordAuth: false,
		pagesMap: restorePagesMap(),
	}))

	return {
		appWillMount: async () => {},
	}
}

export const ProtectedPagesAppWillMountHandler = withDependencies(
	[
		named(FeatureStateSymbol, name),
		named(SiteFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		Router,
		CurrentRouteInfoSymbol,
		optional(SiteMembersApiSymbol),
		optional(PasswordProtectedPageApiSymbol),
		SeoSiteSymbol,
		LoggerSymbol,
		ExperimentsSymbol,
		BrowserWindowSymbol,
	],
	protectedPagesLoginAndNavigate
)
