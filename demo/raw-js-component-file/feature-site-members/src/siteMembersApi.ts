import { named, withDependencies, optional } from '@wix/thunderbolt-ioc'
import type {
	IFetchApi,
	ILogger,
	IPropsStore,
	IStructureAPI,
	ViewerModel,
	ILanguage,
	BrowserWindow,
	WixBiSession,
	Experiments,
	ICyclicTabbing,
	CandidateRouteInfo,
	IMultilingual,
} from '@wix/thunderbolt-symbols'
import {
	Fetch,
	LoggerSymbol,
	Props,
	SiteFeatureConfigSymbol,
	StructureAPI,
	ViewerModelSym,
	BrowserWindowSymbol,
	MasterPageFeatureConfigSymbol,
	WixBiSessionSymbol,
	BusinessLoggerSymbol,
	LanguageSymbol,
	CurrentRouteInfoSymbol,
	ExperimentsSymbol,
	FeatureStateSymbol,
	CaptchaApiSymbol,
	FeatureExportsSymbol,
} from '@wix/thunderbolt-symbols'
import type { ICaptchaApi } from '@wix/thunderbolt-commons'
import { isSSR, getRuntimeStyleOverridesManager, getOpenCaptcha } from '@wix/thunderbolt-commons'
import type { ISessionManager } from 'feature-session-manager'
import { SessionManagerSymbol } from 'feature-session-manager'
import type { IRouter, IUrlHistoryManager, ICurrentRouteInfo } from 'feature-router'
import { Router, UrlHistoryManagerSymbol } from 'feature-router'
import type { ISiteScrollBlocker } from 'feature-site-scroll-blocker'
import { SiteScrollBlockerSymbol } from 'feature-site-scroll-blocker'
import type { ILightbox } from 'feature-lightbox'
import { LightboxSymbol } from 'feature-lightbox'
import type { IReporterApi } from 'feature-reporter'
import { ReporterSymbol } from 'feature-reporter'
import { getHeadlessClientId } from '@wix/wix-to-headless-redirect-client'
import { uniqueId, partition } from 'lodash'
import {
	INTERACTIONS /* , DIALOGS, NOTIFICATIONS */,
	AUTH_RESULT_REASON,
	UNSUPPORTED_AGENTS_FOR_SOCIAL_AUTH,
	INVISIBLE_CAPTCHA_API_KEY,
	TRACK_EVENTS,
	getTrackEventParams,
	AUTH_METHODS,
	ERROR_CODES,
	CAPTCHA_REQUIRED_RESPONSE,
	newIAMResetPasswordTokenPrefix,
	idpConnectionIdToVendorNames,
	KNOWN_CONNECTION_APPEFIDS,
	TPA_PAGES,
	NOT_PERMITTED,
	RESET_PASSWORD_ROUTE,
	TPA_PAGE_IDS_TO_ROUTES,
	memberDetailsStorageKey,
	ROUTER_PREFIX,
} from './constants'
import type { CommonProps, VerificationCodeProps } from './dialogService'
import { factory as dialogServiceFactory } from './dialogService'
import { name } from './symbols'
import type {
	AuthenticationToken,
	IContactInfo,
	ISiteMembersApi,
	LoginOptions,
	LoginResult,
	MemberDetails,
	SiteMembersSiteConfig,
	SiteMembersMasterPageConfig,
	ViewModeProp,
	SocialAuthComponentProps,
	ILoginOptions,
	ISignUpOptions,
	RequestAuthorizedPagesResult,
	AuthorizedPages,
	RegisterResult,
	SiteMembersState,
	IEmailVerification,
	IAMPlatformLoginResponse,
	IShowAuthPageOptions,
	GetMyMemberResponse,
	GetMemberRoleResponse,
	Member,
	TpaPageParams,
	CombinedCollectionSettings,
} from './types'
import { TpaPage, Role } from './types'
import {
	sleep,
	getVisitorId,
	getPerformFetch,
	googleSdkFactory,
	isLoginAcceptableError,
	isSignupAcceptableError,
	_getSocialAuthComponentProps,
	getInvisibleCaptchaTokenFactory,
	toAuthorizedPages,
	serializeIdentityProfile,
	SSO_ERRORS,
	navigateToAuthentication,
	navigateBackToAuthorization,
	getErrorCode,
	withFallback,
	memberDetailsFromIAMResponseV2,
	memberDetailsFromIAMResponse,
	hangingPromise,
	getResetPasswordRedirectUrl,
	isValidRedirectUrl,
} from './utils'
import type { BusinessLogger, IBsiManager } from 'feature-business-logger'
import { BsiManagerSymbol } from 'feature-business-logger'
import { CyclicTabbingSymbol } from 'feature-cyclic-tabbing'
import { BIEvents } from './biEvents'
import { SMPopupsSymbol } from './symbols'
import type { SMPopups } from './smPopups'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { SiteMembersSettingsService } from './smSettings'
import { createMemberPrivacySettingsService, getCommunityOptions } from './communityUtils'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import { toMemberDetails } from './mapper'
import { createHttpClient } from '@wix/http-client'
import { loginV2, registerV2, logout } from '@wix/ambassador-iam-authentication-v1-authentication/http'
import { createSessionCookie } from '@wix/ambassador-iam-cookie-v1-cookie/http'
import type {
	CaptchaToken,
	StateMachineResponse,
	LoginV2Request,
	RegisterV2Request,
} from '@wix/ambassador-iam-authentication-v1-authentication/types'
import { PrivacyStatus, StateType, StatusName } from '@wix/ambassador-iam-authentication-v1-authentication/types'
import { verifyDuringAuthentication } from '@wix/ambassador-iam-verification-v1-start-response/http'
import { MultilingualSymbol } from 'feature-multilingual'
import { openIdpPopup } from './openIdpPopup'

// While our `login`,`register` and related functions don't officially support returning authorized
// pages, we know that our implementation is capable of doing so, if explicitly requested.
// We use this internal type to convey this information only within this file so that we can use
// this hidden `pages` result throughout our implementation.
type ExtendedLoginResult = LoginResult & { pages?: AuthorizedPages }
type ExtendedRegisterResult = RegisterResult & { pages?: AuthorizedPages }

const siteMembersApi = (
	siteFeatureConfig: SiteMembersSiteConfig,
	siteMembersMasterPageConfig: SiteMembersMasterPageConfig,
	featureState: IFeatureState<SiteMembersState>,
	siteMembersExports: IFeatureExportsStore<typeof name>,
	fetchApi: IFetchApi,
	logger: ILogger,
	viewerModel: ViewerModel,
	sessionManager: ISessionManager,
	propsStore: IPropsStore,
	structureApi: IStructureAPI,
	language: ILanguage,
	browserWindow: BrowserWindow,
	router: IRouter,
	siteScrollBlocker: ISiteScrollBlocker,
	urlHistoryManager: IUrlHistoryManager,
	businessLogger: BusinessLogger,
	wixBiSession: WixBiSession,
	popups: ILightbox | undefined,
	smPopups: SMPopups,
	currentRouteInfo: ICurrentRouteInfo,
	experiments: Experiments,
	reporter: IReporterApi = { trackEvent: () => 0, register: () => () => {} },
	captcha: ICaptchaApi,
	cyclicTabbing: ICyclicTabbing,
	bsiManager?: IBsiManager,
	multiLingual?: IMultilingual
): ISiteMembersApi => {
	const runtimeStyleOverridesManager = getRuntimeStyleOverridesManager()
	const {
		loginSocialBarOnSite,
		protectedHomepage,
		smSessionCookie,
		memberInfoAppId,
		membersInfoAppDefId,
		smcollectionId,
		isTemplate,
		routerPrefix,
	} = siteFeatureConfig
	let { sm_efCookie } = siteFeatureConfig
	const metasiteAppDefinitionId = '22bef345-3c5b-4c18-b782-74d4085112ff'
	const svSession = sessionManager.getUserSession()!
	const getMetaSiteInstance = () => sessionManager.getAppInstanceByAppDefId(metasiteAppDefinitionId) || ''
	const getBiVisitorId = () => getVisitorId(sessionManager)

	const deprecateAppIdExperimentOn = experiments['specs.thunderbolt.deprecateAppId']
	const shouldUsePlatformizedAuth = experiments['specs.ident.usePlatformizedSMAuth']
	const shouldUsePlatformizedAuthLogin = experiments['specs.thunderbolt.addPlatformizationOptionLoginFlow']
	const shouldUsePlatformizedAuthSignUp = experiments['specs.thunderbolt.addPlatformizationOptionSignUpFlow']
	const shouldSearchForRouterPrefix = experiments['specs.thunderbolt.shouldSearchForRouterPrefix']
	const shouldUseUrlFromBrowserWindowInsteadOfViewerModel =
		!!experiments['specs.thunderbolt.useUrlFromBrowserWindowInsteadOfViewerModel']
	const shouldValidateRedirectUrl = experiments['specs.thunderbolt.shouldValidateRedirectUrl']
	const isLoggedIn = () => !!(sessionManager.getSiteMemberId() || sessionManager.getSmToken())
	const {
		smSettings,
		tpaAppDefinitionIds,
		tpaApplicationIds,
		tpaPageIds,
		policyLinks,
		translations,
		isBuilderComponentModel,
	} = siteMembersMasterPageConfig

	const isMemberInfoPage = deprecateAppIdExperimentOn
		? tpaAppDefinitionIds![membersInfoAppDefId!]
		: memberInfoAppId && tpaApplicationIds![memberInfoAppId]

	const {
		metaSiteId,
		externalBaseUrl,
		siteId: viewerModelSiteId,
		siteRevision: viewerModelSiteRevision,
	} = viewerModel.site
	const ssrCachedRequestUrl = viewerModel.requestUrl
	const viewMode = viewerModel.viewMode
	const siteId = viewerModel.anywhereConfig?.siteId ?? viewerModelSiteId
	const siteRevision = viewerModel.anywhereConfig?.revision ?? viewerModelSiteRevision

	const isUnsupportedAgentForSocialAuth =
		UNSUPPORTED_AGENTS_FOR_SOCIAL_AUTH.findIndex((ua) => browserWindow?.navigator?.userAgent?.includes(ua)) !== -1
	const isSocialAuthSupported = !isUnsupportedAgentForSocialAuth
	const isCustomLoginSocialAuthSupported = !isUnsupportedAgentForSocialAuth
	const authenticateSessionUrl = `/_api/wix-sm-webapp/tokens/verify/${metaSiteId}/${siteId}`
	const authorizeMemberPagesUrl = `${externalBaseUrl.replace(/\/$/, '')}/api/wix-sm/v1/authorize/${siteId}/pages`
	const logoutUrl = `/_api/wix-sm-webapp/tokens/logout/${metaSiteId}`
	const changePasswordUrl = `/_api/wix-sm-webapp/member/changePasswordWithMailToken?metaSiteId=${metaSiteId}&collectionId=${smcollectionId}`
	const sendSetPasswordEmailUrl = '/_api/wix-sm-webapp/members/v1/auth/members/send-set-password-email'
	const resendEmailVerificationUrl = '/_api/wix-sm-webapp/tokens/email/resend'
	const iamPlatformSendResetPasswordEmailUrl = '/_api/iam/recovery/v1/send-email'
	const iamPlatformChangePasswordUrl = '/_api/iam/recovery/v1/recover'
	const stateMachineServiceUrl = '/_api/iam/state-machine-service'

	const defaultDialog = smSettings.smFirstDialogLogin ? 'login' : 'signup'
	const {
		socialLoginFacebookEnabled: _ignored_1,
		socialLoginGoogleEnabled: _ignored_2,
		termsOfUse,
		privacyPolicy,
		codeOfConduct,
		customSignUpPageId,
		customSignInPageId,
	} = smSettings
	const { privacyNoteType, joinCommunityCheckedByDefault } = getCommunityOptions(smSettings)

	let memberDetails = {} as MemberDetails
	let savedSessionToken = smSessionCookie
	const prefixUrl = shouldSearchForRouterPrefix ? routerPrefix : ROUTER_PREFIX

	const _getMemberDetailsWithWaterfall = async (): Promise<MemberDetails | null> => {
		let member: Member | undefined
		try {
			const memberResponse = await performFetch<GetMyMemberResponse>('/_api/members/v1/members/my?fieldsets=FULL', {
				headers: {
					authorization: sessionManager.getAppInstanceByAppDefId(metasiteAppDefinitionId) ?? '',
				},
			})

			member = memberResponse.member
		} catch (e) {
			return null
		}

		const { role } = await withFallback(
			() =>
				performFetch<GetMemberRoleResponse>(`/api/wix-sm/v1/members/${member?.id}/role`, {
					headers: {
						authorization: sessionManager.getAppInstanceByAppDefId(metasiteAppDefinitionId) ?? '',
					},
				}),
			() => ({ role: Role.MEMBER })
		)
		return toMemberDetails({ member, role })
	}
	const experimentWithBrowserCaching = (_memberDetails: MemberDetails) => {
		const memberDetailsStorage = browserWindow?.localStorage?.getItem?.(memberDetailsStorageKey)
		const memberDetailsResultStringify = JSON.stringify(_memberDetails)
		if (memberDetailsStorage && memberDetailsStorage !== memberDetailsResultStringify) {
			return biEvents.cachePrediction()
		}
		browserWindow?.localStorage?.setItem?.(memberDetailsStorageKey, memberDetailsResultStringify)
	}

	const _getMemberDetails = async (): Promise<MemberDetails | null> => {
		const [member, role]: [Member | undefined | null, Role | undefined | null] = await Promise.all([
			withFallback(
				async () => {
					const response = await performFetch<GetMyMemberResponse>('/_api/members/v1/members/my?fieldsets=FULL', {
						headers: {
							authorization: sessionManager.getAppInstanceByAppDefId(metasiteAppDefinitionId) ?? '',
						},
					})
					return response.member
				},
				() => null
			),
			withFallback(
				async () => {
					const response = await performFetch<GetMemberRoleResponse>(
						`/api/wix-sm/v1/members/${sessionManager.getSiteMemberId()}/role`,
						{
							headers: {
								authorization: sessionManager.getAppInstanceByAppDefId(metasiteAppDefinitionId) ?? '',
							},
						}
					)
					return response.role
				},
				() => Role.MEMBER
			),
		])
		if (!member || !role) {
			return null
		}
		return toMemberDetails({ member, role })
	}

	const onLoginCallbacks: { [callbackId: string]: (user: MemberDetails) => void } = {}
	const triggerLoginCallbacks = (callbackMemberDetails: MemberDetails) => {
		return Promise.all(
			Object.entries(onLoginCallbacks).map(async ([callbackId, cb]) => {
				try {
					const result = await Promise.race([cb(callbackMemberDetails), sleep(3000).then(() => '$$$timeout$$$')])

					if (result === '$$$timeout$$$') {
						throw new Error(`callback ${callbackId} timed out`)
					}
				} catch (e) {
					logger.captureError(e as Error, { tags: { feature: 'site-members' } })
				}
			})
		)
	}
	const onLogoutCallbacks: { [callbackId: string]: () => void } = {}
	const triggerLogoutCallbacks = () => {
		return Promise.all(
			Object.entries(onLogoutCallbacks).map(async ([callbackId, cb]) => {
				try {
					const result = await Promise.race([cb(), sleep(3000).then(() => '$$$timeout$$$')])

					if (result === '$$$timeout$$$') {
						throw new Error(`callback ${callbackId} timed out`)
					}
				} catch (e) {
					logger.captureError(e as Error, { tags: { feature: 'site-members' } })
				}
			})
		)
	}

	const biEvents = BIEvents({
		sessionManager,
		businessLogger,
		wixBiSession,
		viewMode: viewMode?.toUpperCase() as ViewModeProp,
		language,
	})
	biEvents.siteMembersFeatureLoaded()
	const onMemberDetailsRefresh: { [callbackId: string]: (user: MemberDetails) => void } = {}
	const triggerOnMemberDetailsRefreshCallbacks = (callbackMemberDetails: MemberDetails) => {
		return Promise.all(
			Object.values(onMemberDetailsRefresh).map(async (cb) => {
				try {
					await cb(callbackMemberDetails)
				} catch (e) {
					logger.captureError(e as Error, { tags: { feature: 'site-members' } })
				}
			})
		)
	}

	const performFetch = getPerformFetch(
		fetchApi,
		{
			credentials: 'same-origin',
			headers: {
				accept: 'application/json',
				'x-wix-site-revision': `${siteRevision}`,
				'x-wix-client-artifact-id': 'thunderbolt',
			},
		},
		ssrCachedRequestUrl
	)
	const httpClient = createHttpClient({
		isSSR: !process.env.browser && !experiments.httpClientNeverSsr,
		...(experiments['specs.thunderbolt.siteMembersMultilingualLanguage'] && language?.isMultilingualEnabled
			? {
					multilingualOptions: {
						isPrimaryLanguage: multiLingual?.isOriginalLanguage || true,
						locale: multiLingual?.currentLanguage.locale ?? 'en',
						lang: multiLingual?.currentLanguage.languageCode ?? 'en',
					},
				}
			: {}),
	})
	const useBaseUrlForPrivacySettings = !!experiments['specs.thunderbolt.membersPrivacySettingsUseBaseUrl']
	const baseURL =
		useBaseUrlForPrivacySettings && siteFeatureConfig.baseUrl ? new URL(siteFeatureConfig.baseUrl).origin : undefined
	const memberPrivacySettingsService = createMemberPrivacySettingsService(httpClient, getMetaSiteInstance, baseURL)

	const dialogService = dialogServiceFactory.get(
		propsStore,
		structureApi,
		siteScrollBlocker,
		browserWindow,
		cyclicTabbing,
		isBuilderComponentModel
	)
	const params = new URL(ssrCachedRequestUrl).searchParams
	const queryParams: { [paramKey: string]: string } = {}
	params.forEach((value, key) => {
		queryParams[key] = value
	})
	const clientId = getHeadlessClientId({ query: queryParams })
	const siteMembersSettingsService = SiteMembersSettingsService(
		performFetch,
		logger,
		reporter,
		experiments,
		() => getMetaSiteInstance(),
		clientId
	)
	const getInvisibleCaptchaToken = getInvisibleCaptchaTokenFactory(browserWindow)
	const googleSdk = googleSdkFactory(browserWindow, runtimeStyleOverridesManager)

	const bsiRaw = bsiManager?.getBsi()
	// The bsi has a weird format: guid|pageNumber, we only need the guid
	const bsi = bsiRaw ? bsiRaw.split('|')[0] : '00000000-0000-0000-0000-000000000000'
	const reportSocialAuthStarted = (vendor: string) => {
		logger.interactionStarted(INTERACTIONS.SOCIAL_APP_LOGIN_WITH_VENDOR(vendor))
	}
	const api = {
		appDidMount() {},
		async handleSocialLoginResponse(
			payload: IAMPlatformLoginResponse,
			idpConnectionId: string,
			returnPages: boolean = false,
			loadNewSessionCreatesCookie: boolean = false
		): Promise<ExtendedLoginResult> {
			const vendor = idpConnectionIdToVendorNames[idpConnectionId] ?? idpConnectionId
			// Login has already fully happened on the server at this point, so it makes sense
			// to log a complete interaction without waiting for anything.
			// This "noop" interaction and event pair is still needed to maintain compatibility
			// with the other form of social login as implemented in handleOauthToken above
			logger.interactionStarted(INTERACTIONS.SOCIAL_APP_LOGIN)
			logger.interactionEnded(INTERACTIONS.SOCIAL_APP_LOGIN)
			logger.interactionEnded(INTERACTIONS.SOCIAL_APP_LOGIN_WITH_VENDOR(vendor))
			reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.LOGIN.SUBMIT, vendor))

			if (!experiments['specs.thunderbolt.useNewPostLoginRedirect']) {
				navigateToAuthentication(
					browserWindow,
					ssrCachedRequestUrl,
					{},
					shouldUseUrlFromBrowserWindowInsteadOfViewerModel
				)
			}

			const loginResult = await api.handleIAMLoginResponseV1(payload, returnPages, loadNewSessionCreatesCookie)

			reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.LOGIN.SUCCESS, vendor))

			return loginResult
		},

		async handleIAMLoginResponseV1(
			loginResponse: IAMPlatformLoginResponse,
			returnPages: boolean = false,
			loadNewSessionCreatesCookie: boolean = false
		): Promise<ExtendedLoginResult> {
			if (loginResponse.identity?.status?.name === StatusName.PENDING) {
				// In case member need to wait for admin approval
				if (shouldUsePlatformizedAuth) {
					const adminApprovalPageId = tpaPageIds![TPA_PAGES.ADMIN_APPROVAL]
					if (adminApprovalPageId) {
						return new Promise<ExtendedLoginResult>((_, reject) => {
							popups
								?.open(
									adminApprovalPageId,
									() => {
										navigateToAuthentication(
											browserWindow,
											ssrCachedRequestUrl,
											{
												error: SSO_ERRORS.ACCESS_DENIED,
											},
											shouldUseUrlFromBrowserWindowInsteadOfViewerModel
										)
										// We must reject both, since we might get here by promptLogin() or by simply register()
										smPopups.rejectAuthenticationRequest()
										reject(AUTH_RESULT_REASON.CANCELED)
										api.closeCustomAuthenticationDialogs(false)
									},
									{ email: loginResponse.identity?.email?.address }
								)
								.then(() => {
									dialogService.hideDialog(true)
								})
						})
					}
				}
				return api.showAdminApprovalDialog(loginResponse.identity.email?.address ?? '') as Promise<ExtendedLoginResult>
			}

			const member = memberDetailsFromIAMResponse(loginResponse)
			const token = loginResponse.sessionToken as string
			const pages = toAuthorizedPages(loginResponse.additionalData?.protectedPages as any)

			const redirected = navigateToAuthentication(
				browserWindow,
				ssrCachedRequestUrl,
				{ sessionToken: token },
				shouldUseUrlFromBrowserWindowInsteadOfViewerModel
			)
			if (redirected && experiments['specs.thunderbolt.useNewPostLoginRedirect']) {
				return hangingPromise()
			}

			const returnedPages = (await api.applySessionToken(
				token,
				member,
				returnPages && !pages,
				loadNewSessionCreatesCookie
			)) as AuthorizedPages
			const resolvedPages = pages ?? returnedPages

			return { sessionToken: token, member, ...(returnPages ? { pages: resolvedPages } : {}) }
		},
		async promptLogin(
			loginOptions: Partial<LoginOptions> = {},
			isCloseable: boolean = smPopups.config?.isCloseable ?? true,
			returnPages: boolean = smPopups.config?.returnPages ?? false
		): Promise<ExtendedLoginResult> {
			const { mode, modal } = loginOptions
			const modeToDisplay = mode ?? defaultDialog
			const isLoginMode = modeToDisplay === 'login'
			const displayMode = modal ? 'popup' : 'fullscreen'
			// In case of previewing a template site we don't want to present the login/signup view but a notification
			if (isTemplate) {
				await api.showNotificationDialog(
					translations.templateNotificationTitle,
					translations.templateNotificationMessage,
					translations.containerOk
				)
				return Promise.reject(AUTH_RESULT_REASON.CANCELED)
			}

			// Get captcha settings BEFORE loading the SDK to determine if invisible captcha is needed.
			// When recaptchaOption is 'ALWAYS', only visible captcha is used, so we load with 'explicit'
			// to prevent the badge from appearing. When 'SUSPECTED_BOTS_ONLY', we need the invisible
			// captcha and load with the site key (which shows the badge).
			const captchaSettings = await siteMembersSettingsService.getCaptchaSettings()
			const needsInvisibleCaptcha = isLoginMode ? captchaSettings.invisible.login : captchaSettings.invisible.signup
			await googleSdk.loadScript(language.userLanguage, needsInvisibleCaptcha ? INVISIBLE_CAPTCHA_API_KEY : 'explicit')

			// TODO - platformize login and signup dialogs
			if (isLoginMode) {
				return api.showLoginDialog({ isCloseable, displayMode, returnPages })
			} else {
				return api.showSignUpDialog({ isCloseable, displayMode, returnPages })
			}
		},
		promptForgotPassword(isCloseable: boolean = true): Promise<void> {
			return new Promise((resolve, reject) => {
				smPopups.assignRequestAuthenticationPromise(resolve, reject)
				const props: CommonProps = {
					isCloseable,
					directionByLanguage: language.directionByLanguage,
					translations,
				}
				const actions = {
					async onCloseDialogCallback() {
						navigateBackToAuthorization(
							browserWindow,
							ssrCachedRequestUrl,
							shouldUseUrlFromBrowserWindowInsteadOfViewerModel
						)
						biEvents.closingDialog('RequestResetPassword')
						dialogService.hideDialog()
						smPopups.rejectAuthenticationRequest()
					},
					onSubmitCallback(email: string) {
						return api.sendResetPasswordEmail(email).then(async () => {
							const close = () => {
								navigateBackToAuthorization(
									browserWindow,
									ssrCachedRequestUrl,
									shouldUseUrlFromBrowserWindowInsteadOfViewerModel
								)
								smPopups.resolveAuthenticationRequest()
								reject(AUTH_RESULT_REASON.CANCELED)
							}

							api.showNotificationDialog(
								translations.resetPasswordCheckEmailTitle,
								translations.resetPasswordCheckEmailText,
								translations.resetPasswordOk,
								close,
								close
							)
						})
					},
				}
				if (shouldUsePlatformizedAuth) {
					const forgotPasswordPageId = tpaPageIds![TPA_PAGES.FORGOT_PASSWORD]
					if (forgotPasswordPageId) {
						// Prevent the login lightbox closeHandler from rejecting the authentication request
						// when the forgot password lightbox opens and closes it
						smPopups.preventCustomPopupCloseCallback()
						const closeHandler = () => {
							// After forgot password flow completes, re-show the login dialog
							// so the user can log in after receiving their password reset email.
							// Don't navigate back to the protected page (which would fail and show "access restricted").
							// Note: promptLogin will call smPopups.assignRequestAuthenticationPromise with its own
							// resolve/reject, which will overwrite ours. But we chain the promises explicitly here
							// so the original promise from promptForgotPassword will still resolve/reject correctly.
							api
								.promptLogin({ mode: 'login' })
								.then(() => resolve())
								.catch(reject)
						}
						return popups?.open(forgotPasswordPageId, closeHandler).then(() => {
							dialogService.hideDialog(true)
						})
					}
				}
				dialogService.displayDialog('RequestPasswordResetDialog', props, actions)
			})
		},
		/**
		 * @deprecated this has been superceded by requestAuthorizedPages and can be removed when we merge specs.thunderbolt.newAuthorizedPagesFlow
		 */
		async requestAuthentication(loginOptions: Partial<LoginOptions> = {}): Promise<{
			success: boolean
			token?: AuthenticationToken
			reason: string
		}> {
			if (savedSessionToken) {
				return { success: true, token: savedSessionToken, reason: AUTH_RESULT_REASON.ALREADY_LOGGED_IN }
			}

			try {
				// The dialog is not closeable if and only if the homepage is protected and login was prompted by navigation
				const isCloseable = !protectedHomepage
				const { sessionToken } = await api.promptLogin(loginOptions, isCloseable)
				return { success: true, token: sessionToken, reason: AUTH_RESULT_REASON.SUCCESS }
			} catch (reason) {
				return { success: false, reason: reason as string }
			}
		},
		// If a member is logged in, explicitly request their authorized pages using the metaSite instance as the
		// auth header.
		// Otherwise, log the member in and return the authorized pages the can optionally be extracted
		// from the login process.
		async requestAuthorizedPages(loginOptions: Partial<LoginOptions> = {}): Promise<RequestAuthorizedPagesResult> {
			if (isLoggedIn()) {
				const pages = await api.authorizeMemberPagesBySignedInstance(getMetaSiteInstance())
				return {
					success: true,
					pages,
				}
			}

			try {
				// The dialog is not closeable if and only if the homepage is protected and login was prompted by navigation
				const isCloseable = !protectedHomepage
				smPopups.setConfig({ isCloseable, returnPages: true })
				const data = await api.promptLogin(loginOptions, isCloseable, true)
				smPopups.reset()
				return { success: true, pages: data.pages! }
			} catch (reason) {
				return { success: false, reason: reason as string }
			}
		},
		async applySessionToken(
			token: string,
			newMemberDetails?: MemberDetails,
			returnPages: boolean = false,
			loadNewSessionCreatesCookie: boolean = false
		): Promise<void | AuthorizedPages> {
			if (isSSR(browserWindow)) {
				throw NOT_PERMITTED
			}
			logger.interactionStarted(INTERACTIONS.VERIFY_TOKEN)

			let pagesFromCreateSessionCookie: AuthorizedPages | undefined

			if (!loadNewSessionCreatesCookie) {
				const response = await httpClient
					.request(createSessionCookie({ sessionToken: token, protectedPages: returnPages }), {
						signedInstance: getMetaSiteInstance(),
					})
					.then((r) => r.data)
					.catch((error) => {
						throw error.response?.data ?? error
					})

				await sessionManager.loadNewSession({ reason: 'memberLogin' })

				if (returnPages) {
					// @ts-expect-error ignore while IAM ambassador missing a response interface
					pagesFromCreateSessionCookie = toAuthorizedPages(response?.protectedPages)
				}
			} else {
				await sessionManager.loadNewSession({ reason: 'memberLogin', authorizationCode: token })
			}

			logger.interactionEnded(INTERACTIONS.VERIFY_TOKEN)

			savedSessionToken = token

			memberDetails = newMemberDetails ?? ((await api.getMemberDetails()) as MemberDetails)

			await triggerLoginCallbacks(memberDetails)
			siteMembersExports.export({ memberDetails })

			if (returnPages) {
				if (pagesFromCreateSessionCookie) {
					return pagesFromCreateSessionCookie as AuthorizedPages
				} else {
					// If pages are required but weren't fetched via createSessionCookie, fetch them
					return await api.authorizeMemberPagesBySignedInstance(getMetaSiteInstance())
				}
			}
		},
		/**
		 * @deprecated this has been superceded by authorizeMemberPagesBySignedInstance and can be removed when we merge specs.thunderbolt.newAuthorizedPagesFlow
		 */
		async authorizeMemberPagesByCookie(): Promise<AuthorizedPages> {
			const options = isSSR(browserWindow)
				? {
						headers: {
							cookie: `smSession=${smSessionCookie}`,
						},
					}
				: undefined
			const { authorizedPages } = await performFetch(authorizeMemberPagesUrl, options)

			return authorizedPages
		},
		/**
		 * @deprecated this has been superceded by authorizeMemberPagesBySignedInstance and can be removed when we merge specs.thunderbolt.newAuthorizedPagesFlow
		 */
		async authorizeMemberPagesByToken(token: string): Promise<AuthorizedPages> {
			// Due to a design flaw, we may sometime be provided with a token that's not valid
			// for this endpoint. This happens when the member is already logged in and the token
			// is the same as the one we have saved in the smSession cookie. In this case we 'cheat'
			// and delegate to authorizeMemberPagesByCookie which works fine with this token, provided
			// that it's sent via cookie.
			if (token === smSessionCookie) {
				return this.authorizeMemberPagesByCookie()
			}

			const { payload } = await performFetch(authenticateSessionUrl, {
				method: 'POST',
				body: `token=${token}`,
			})

			const { pages } = payload

			return pages
		},
		async authorizeMemberPagesBySignedInstance(instance: string): Promise<AuthorizedPages> {
			const options = {
				headers: {
					authorization: instance,
				},
			}
			const { authorizedPages } = await performFetch(authorizeMemberPagesUrl, options)
			return authorizedPages
		},
		async getMemberDetails(refreshCurrentMember: boolean = false): Promise<MemberDetails | null> {
			if (memberDetails.id && !refreshCurrentMember) {
				return memberDetails
			}
			if (!sessionManager.getSiteMemberId()) {
				return null
			}

			const memberDetailsResult = await (experiments['specs.thunderbolt.preventGetMemberDetailsWaterfall']
				? _getMemberDetails()
				: _getMemberDetailsWithWaterfall())
			if (!memberDetailsResult) {
				return null
			}

			experimentWithBrowserCaching(memberDetailsResult)
			memberDetails = memberDetailsResult
			siteMembersExports.export({ memberDetails })

			if (refreshCurrentMember) {
				await triggerOnMemberDetailsRefreshCallbacks(memberDetails)
			}

			return memberDetails
		},
		async sendForgotPasswordMail(email: string) {
			return this.sendResetPasswordEmail(email)
		},
		async sendResetPasswordEmail(email: string) {
			logger.interactionStarted(INTERACTIONS.RESET_PASSWORD)
			const userLanguage = language.userLanguage
			const url = iamPlatformSendResetPasswordEmailUrl
			const redirect = { url: getResetPasswordRedirectUrl(ssrCachedRequestUrl) ?? ssrCachedRequestUrl }
			const body = JSON.stringify({ language: userLanguage, email, redirect })
			const headers = {
				'Content-Type': 'application/json',
				authorization: getMetaSiteInstance(),
			}
			await performFetch(url, {
				headers,
				method: 'POST',
				body,
			})

			logger.interactionEnded(INTERACTIONS.RESET_PASSWORD)
		},
		async sendSetPasswordEmail(email: string, options?: { hideIgnoreMessage?: boolean }): Promise<boolean> {
			const response = await performFetch(sendSetPasswordEmailUrl, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					authorization: getMetaSiteInstance(),
				},
				body: JSON.stringify({
					email,
					...(options?.hideIgnoreMessage ? { hideIgnoreMessage: options.hideIgnoreMessage } : {}),
				}),
			})

			return !!response?.accepted
		},
		async changePassword(newPassword: string, forgotPasswordToken: string) {
			const encodedNewPassword = encodeURIComponent(newPassword)
			const isNewIAMPasswordFlow = forgotPasswordToken.startsWith(newIAMResetPasswordTokenPrefix)
			const url = isNewIAMPasswordFlow ? iamPlatformChangePasswordUrl : changePasswordUrl
			const body = isNewIAMPasswordFlow
				? JSON.stringify({ password: newPassword, recovery_token: forgotPasswordToken })
				: `newPassword=${encodedNewPassword}&forgotPasswordToken=${forgotPasswordToken}`
			const headers = isNewIAMPasswordFlow
				? {
						'Content-Type': 'application/json',
						authorization: getMetaSiteInstance(),
					}
				: undefined
			await performFetch(url, {
				method: 'POST',
				headers,
				body,
			})
		},
		async sendEmailVerification(memberId: string) {
			return this.resendEmailVerification(memberId)
		},
		async resendEmailVerification(memberId: string) {
			await performFetch(`${resendEmailVerificationUrl}/${memberId}`)
		},
		async logout(redirectToUrl?: string): Promise<boolean> {
			if (!isLoggedIn()) {
				return false
			}

			if (experiments['specs.thunderbolt.logoutOnIAM']) {
				await httpClient.request(logout({}), { signedInstance: getMetaSiteInstance() }).catch(() => {
					reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.LOGOUT.FAIL))
				})
			} else {
				await performFetch(logoutUrl, {
					method: 'POST',
				}).catch(() => {
					reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.LOGOUT.FAIL))
				})
			}

			await triggerLogoutCallbacks()

			if (redirectToUrl) {
				const relativeUrl = `./${redirectToUrl.replace(/^\//, '')}`

				await router.navigate(relativeUrl)
			}

			const headlessLogoutRedirectUrl = await api.getLogoutUrl()

			if (headlessLogoutRedirectUrl) {
				browserWindow?.location.replace(headlessLogoutRedirectUrl)
			} else if (!isSSR(browserWindow)) {
				browserWindow.document.location.reload()
			}

			if (redirectToUrl || headlessLogoutRedirectUrl) {
				return true
			} // redirected on logout

			return false
		},
		registerToUserLogin(
			callback: (user: MemberDetails) => any,
			callbackId: string = uniqueId(
				'callback'
			) /* This specific prefix is added to maintain compat with previous implementation */
		): string {
			onLoginCallbacks[callbackId] = callback
			return callbackId
		},
		unRegisterToUserLogin(callbackId: string): void {
			delete onLoginCallbacks[callbackId]
		},
		registerToMemberLogout(callback: () => any): string {
			const callbackId = uniqueId('logout_callback')
			onLogoutCallbacks[callbackId] = callback
			return callbackId
		},
		unRegisterToMemberLogout(callbackId: string): void {
			delete onLogoutCallbacks[callbackId]
		},
		registerToMemberDetailsRefresh(callback: (user: MemberDetails) => any): string {
			const callbackId = uniqueId('mdrcb')
			onMemberDetailsRefresh[callbackId] = callback
			return callbackId
		},
		unRegisterToMemberDetailsRefresh(callbackId: string): void {
			delete onMemberDetailsRefresh[callbackId]
		},
		async showWelcomeDialog(isCloseable: boolean = true) {
			const props: CommonProps = {
				isCloseable,
				translations,
			}

			const url = urlHistoryManager.getParsedUrl()
			const actions = {
				onCloseDialogCallback() {
					navigateBackToAuthorization(
						browserWindow,
						ssrCachedRequestUrl,
						shouldUseUrlFromBrowserWindowInsteadOfViewerModel
					)
					biEvents.closingDialog('WelcomeDialog')
					const urlHostname = new URL(ssrCachedRequestUrl).hostname
					const hostName = urlHostname.indexOf('www') === 0 ? urlHostname.substr(3) : urlHostname
					clearCookie('sm_ef', '/', hostName)
					sm_efCookie = ''
					dialogService.hideDialog()
					router.navigate(url.href)
				},
				onSubmitCallback() {
					const urlHostname = new URL(ssrCachedRequestUrl).hostname
					const hostName = urlHostname.indexOf('www') === 0 ? urlHostname.substr(3) : urlHostname
					clearCookie('sm_ef', '/', hostName)
					sm_efCookie = ''
					dialogService.hideDialog()
					if (isMemberInfoPage) {
						// FIXME: We should navigate to memberInfoPage somehow, not to this hardcoded url
						router.navigate('./account/my-account')
					}
					router.navigate(url.href)
				},
			}

			logger.interactionStarted(INTERACTIONS.WELCOME_DIALOG)
			logger.interactionEnded(INTERACTIONS.WELCOME_DIALOG)
			dialogService.displayDialog('WelcomeDialog', props, actions)
		},
		async showNoPermissionsToPageDialog(onCloseCallback?: () => any) {
			if (shouldUsePlatformizedAuth) {
				const noPermissionsPageId = tpaPageIds![TPA_PAGES.ACCESS_RESTRICTED]
				if (noPermissionsPageId) {
					router.navigate(`${prefixUrl}${TPA_PAGE_IDS_TO_ROUTES[TPA_PAGES.ACCESS_RESTRICTED]}`)
					return
				}
			}
			const actions = {
				onCloseDialogCallback() {
					navigateBackToAuthorization(
						browserWindow,
						ssrCachedRequestUrl,
						shouldUseUrlFromBrowserWindowInsteadOfViewerModel
					)
					dialogService.hideDialog()
					if (onCloseCallback) {
						onCloseCallback()
					}
				},
				onSwitchAccountLinkClick() {
					api.logout()
				},
			}

			dialogService.displayDialog(
				'NoPermissionsToPageDialog',
				{
					translations,
				},
				actions
			)
		},
		async navigateToResetPasswordPage(token: string) {
			const resetPasswordPageId = tpaPageIds![TPA_PAGES.RESET_PASSWORD]
			if (resetPasswordPageId) {
				// Preserve all existing URL parameters when navigating to reset password page
				const currentUrl = urlHistoryManager.getParsedUrl()
				const resetPasswordUrl = new URL(
					`${prefixUrl}${TPA_PAGE_IDS_TO_ROUTES[TPA_PAGES.RESET_PASSWORD]}`,
					currentUrl.origin
				)

				currentUrl.searchParams.forEach((value, key) => {
					resetPasswordUrl.searchParams.set(key, value)
				})

				resetPasswordUrl.searchParams.set('resetPasswordToken', token)

				return await router.navigate(
					`${prefixUrl}${TPA_PAGE_IDS_TO_ROUTES[TPA_PAGES.RESET_PASSWORD]}${resetPasswordUrl.search}`
				)
			}
			this.showResetPasswordDialog(token)
		},
		async showResetPasswordDialog(token: string) {
			const clearResetPasswordHistory = () => {
				const url = urlHistoryManager.getParsedUrl()
				url.searchParams.delete('forgotPasswordToken')
				url.searchParams.delete('forgotPasswordLang')
				urlHistoryManager.pushUrlState(url)
				return url
			}
			const props = {
				isCloseable: true,
				isTermsOfUseNeeded: !!(termsOfUse?.enabled && policyLinks.termsOfUse),
				isPrivacyPolicyNeeded: !!(privacyPolicy?.enabled && policyLinks.privacyPolicy),
				termsOfUseLink: policyLinks.termsOfUse,
				privacyPolicyLink: policyLinks.privacyPolicy,
				directionByLanguage: language.directionByLanguage,
				translations,
			}

			const actions = {
				onCloseDialogCallback() {
					navigateBackToAuthorization(
						browserWindow,
						ssrCachedRequestUrl,
						shouldUseUrlFromBrowserWindowInsteadOfViewerModel
					)
					biEvents.closingDialog('ResetPasswordDialog')
					const url = clearResetPasswordHistory()

					dialogService.hideDialog()
					router.navigate(url.href)
				},
				async onSubmitCallback(newPassword: string) {
					try {
						await api.changePassword(newPassword, token)
						api.showNotificationDialog(
							translations.resetPasswordSuccessTitle,
							'',
							translations.containerOk,
							async () => {
								if (token.startsWith(newIAMResetPasswordTokenPrefix)) {
									const url = new URL(ssrCachedRequestUrl)
									const redirectUrl = url.searchParams.get('redirectUrl')
									if (redirectUrl) {
										if (shouldValidateRedirectUrl) {
											if (isValidRedirectUrl(redirectUrl)) {
												return browserWindow?.location.replace(redirectUrl)
											} else {
												logger.captureError(new Error('Invalid redirect URL blocked'), {
													tags: { feature: 'site-members' },
												})
											}
										} else {
											return browserWindow?.location.replace(redirectUrl!)
										}
									}
								}
								const url = clearResetPasswordHistory()
								await api.showLoginDialog()
								router.navigate(url.href)
							}
						)
					} catch (error) {
						const errorCode = getErrorCode(error).toString()
						if (
							errorCode !== ERROR_CODES.RESET_PASSWORD_TOKEN_EXPIRED &&
							errorCode !== ERROR_CODES.NEW_RESET_PASSWORD_TOKEN_EXPIRED
						) {
							throw error
						}
						if (shouldUsePlatformizedAuth) {
							const expiredTokenPageId = tpaPageIds![TPA_PAGES.EXPIRED_TOKEN]
							if (expiredTokenPageId) {
								await router.navigate(`${prefixUrl}${TPA_PAGE_IDS_TO_ROUTES[TPA_PAGES.EXPIRED_TOKEN]}`)
								return
							}
						}
						api.showNotificationDialog(
							translations.passwordHasExpiredTitle,
							translations.passwordHasExpiredText,
							translations.passwordHasExpiredOk,
							() =>
								api.promptForgotPassword(props.isCloseable).then(() => {
									const url = urlHistoryManager.getParsedUrl()
									router.navigate(url.href)
								})
						)
					}
				},
			}

			dialogService.displayDialog('ResetPasswordDialog', props, actions)
		},
		async showLoggedInResetPasswordDialog() {
			const props = {
				isCloseable: true,
				directionByLanguage: language.directionByLanguage,
				translations,
			}

			const actions = {
				onCloseDialogCallback() {
					biEvents.closingDialog('LoggedInResetPasswordDialog')

					dialogService.hideDialog()
				},
				async onSubmitCallback() {},
			}
			dialogService.displayDialog('LoggedInResetPasswordDialog', props, actions)
		},
		async showLoginDialog(options: IShowAuthPageOptions = {}, serverError?: any): Promise<ExtendedLoginResult> {
			return new Promise(async (resolve, reject) => {
				api.showLoginDialogWithExternalPromise(options, serverError, { resolve, reject })
			})
		},
		async showLoginDialogWithExternalPromise(
			options: IShowAuthPageOptions = {},
			serverError?: any,
			promiseHandlers?: {
				resolve: (loginResult: ExtendedLoginResult) => void
				reject: (error: unknown) => void
			}
		): Promise<void> {
			const { returnPages, isCloseable, displayMode } = {
				isCloseable: true,
				displayMode: 'fullscreen' as IShowAuthPageOptions['displayMode'],
				returnPages: false,
				...options,
			}

			const captchaSettings = await siteMembersSettingsService.getCaptchaSettings()
			googleSdk.setCaptchaBadgeVisibility(captchaSettings.invisible.login)
			// First check for platformized auth
			if (shouldUsePlatformizedAuthLogin) {
				const loginPageId = tpaPageIds![TPA_PAGES.LOGIN]
				if (loginPageId) {
					return api
						.showAuthenticationDialog(loginPageId, returnPages)
						.then(promiseHandlers?.resolve, promiseHandlers?.reject) as Promise<void>
				}
			}

			// Then check for custom login page
			if (customSignInPageId && popups?.isLightbox(customSignInPageId)) {
				return api
					.showAuthenticationDialog(customSignInPageId, returnPages)
					.then(promiseHandlers?.resolve, promiseHandlers?.reject) as Promise<void>
			}

			// Finally fallback to default dialog
			promiseHandlers && smPopups.assignRequestAuthenticationPromise(promiseHandlers.resolve, promiseHandlers.reject)
			const shouldForceCaptchaVerificationFT =
				experiments['specs.ShouldForceCaptchaVerificationOnLoginSpec'] === 'Enabled'
			const visibleCaptchaIsOn = shouldForceCaptchaVerificationFT || captchaSettings.visible.login
			const [passwordConnections, idps] = partition(await api.getConnections(), {
				appDefId: KNOWN_CONNECTION_APPEFIDS.PASSWORD,
			})
			const headlessLoginRedirectUrl = await api.getLoginUrl()

			const props = {
				bsi,
				displayMode,
				language: language.userLanguage,
				directionByLanguage: language.directionByLanguage,
				isCloseable,
				smCollectionId: smcollectionId,
				svSession,
				biVisitorId: getBiVisitorId(),
				metaSiteId,
				isEmailLoginEnabled: passwordConnections.length > 0,
				idps,
				shouldForceCaptchaVerification: !captchaSettings.invisible.login && visibleCaptchaIsOn,
				isSocialAuthSupported,
				serverError,
				reportBi: businessLogger.reportBi,
				translations,
				externalBaseUrl: api.getExternalBaseUrl(),
				headlessRedirectUrl: headlessLoginRedirectUrl,
			}
			const actions = {
				onCloseDialogCallback() {
					navigateBackToAuthorization(
						browserWindow,
						ssrCachedRequestUrl,
						shouldUseUrlFromBrowserWindowInsteadOfViewerModel
					)
					dialogService.hideDialog()
					biEvents.closingDialog('MemberLoginDialog', displayMode)
					smPopups.rejectAuthenticationRequest()
				},
				submit(email: string, password: string, submitOptions?: ILoginOptions) {
					logger.interactionStarted(INTERACTIONS.DEFAULT_LOGIN)
					biEvents.emailAuthSubmitClicked('MemberLoginDialog', displayMode as string)

					return api
						.login(email, password, submitOptions, returnPages, undefined, true)
						.then((loginResult) => {
							logger.interactionEnded(INTERACTIONS.DEFAULT_LOGIN)
							dialogService.hideDialog()
							promiseHandlers?.resolve(loginResult)
						})
						.catch((error) => {
							if (isLoginAcceptableError(error)) {
								logger.interactionEnded(INTERACTIONS.DEFAULT_LOGIN)
							}

							throw error
						})
				},
				onForgetYourPasswordClick() {
					api.promptForgotPassword(isCloseable)
				},
				onSwitchDialogLinkClick() {
					api.showSignUpDialog({ isCloseable, displayMode, returnPages }).then(promiseHandlers?.resolve, () => {
						smPopups.rejectAuthenticationRequest()
					})
				},
				onBackendSocialLogin(data: IAMPlatformLoginResponse, vendor: string) {
					return api
						.handleSocialLoginResponse(
							data,
							vendor,
							returnPages,
							!!experiments['specs.thunderbolt.loadNewSessionCreatesCookie']
						)
						.then((loginResult) => {
							dialogService.hideDialog()
							promiseHandlers?.resolve(loginResult)
						})
				},
				// Will be called by the component after mounting the social auth iframe to determine what to send inside via postMessage
				getHostReadyPayload: () => ({ visitorId: getBiVisitorId(), svSession }),
				openCaptcha: getOpenCaptcha({ captcha, userLanguage: language.userLanguage }),
				reportSocialAuthStarted,
			}
			biEvents.loginOrSignUpDialogLoaded('MemberLoginDialog', displayMode)
			await dialogService.displayDialog('MemberLoginDialog', props, actions)
			api.closeCustomAuthenticationDialogs(true)
		},
		async showSignUpDialog(options: IShowAuthPageOptions = {}, serverError?: any): Promise<ExtendedLoginResult> {
			const { returnPages, isCloseable, displayMode } = {
				isCloseable: true,
				displayMode: 'fullscreen' as IShowAuthPageOptions['displayMode'],
				returnPages: false,
				...options,
			}
			const captchaSettings = await siteMembersSettingsService.getCaptchaSettings()
			googleSdk.setCaptchaBadgeVisibility(captchaSettings.invisible.signup)

			// Platformized signup dialog support
			if (shouldUsePlatformizedAuthSignUp) {
				const signUpPageId = tpaPageIds![TPA_PAGES.SIGN_UP]
				if (signUpPageId) {
					return api.showAuthenticationDialog(signUpPageId, returnPages)
				}
			}

			if (customSignUpPageId && popups?.isLightbox(customSignUpPageId)) {
				return api.showAuthenticationDialog(customSignUpPageId, returnPages)
			}
			const shouldForceCaptchaVerificationFTs =
				experiments['specs.ShouldPassCaptchaVerificationOnSignupSpec'] !== 'Enabled' &&
				experiments['specs.ShouldForceCaptchaVerificationOnSignupSpec'] === 'Enabled'

			return new Promise(async (resolve, reject) => {
				const visibleCaptchaIsOn =
					shouldForceCaptchaVerificationFTs ||
					(captchaSettings.visible.signup &&
						experiments['specs.ShouldPassCaptchaVerificationOnSignupSpec'] !== 'Enabled')

				const [connections, headlessRedirectUrl] = await Promise.all([api.getConnections(), api.getLoginUrl()])

				const [passwordConnections, idps] = partition(connections, {
					appDefId: KNOWN_CONNECTION_APPEFIDS.PASSWORD,
				})

				smPopups.assignRequestAuthenticationPromise(resolve, reject)

				const props = {
					bsi,
					displayMode,
					language: language.userLanguage,
					directionByLanguage: language.directionByLanguage,
					isCloseable,
					smCollectionId: smcollectionId,
					biVisitorId: getBiVisitorId(),
					svSession,
					metaSiteId,
					isSocialAuthSupported,
					isEmailLoginEnabled: passwordConnections.length > 0,
					idps,
					isCommunityInstalled: await memberPrivacySettingsService.canHavePublicMembers(),
					privacyNoteType,
					joinCommunityCheckedByDefault,
					isTermsOfUseNeeded: !!(termsOfUse?.enabled && policyLinks.termsOfUse),
					isPrivacyPolicyNeeded: !!(privacyPolicy?.enabled && policyLinks.privacyPolicy),
					isCodeOfConductNeeded: !!(codeOfConduct?.enabled && policyLinks.codeOfConduct),
					shouldForceCaptchaVerification: !captchaSettings.invisible.signup && visibleCaptchaIsOn,
					termsOfUseLink: policyLinks.termsOfUse,
					privacyPolicyLink: policyLinks.privacyPolicy,
					codeOfConductLink: policyLinks.codeOfConduct,
					serverError,
					reportBi: businessLogger.reportBi,
					translations,
					externalBaseUrl: api.getExternalBaseUrl(),
					headlessRedirectUrl,
				}
				const actions = {
					onCloseDialogCallback() {
						navigateBackToAuthorization(
							browserWindow,
							ssrCachedRequestUrl,
							shouldUseUrlFromBrowserWindowInsteadOfViewerModel
						)
						dialogService.hideDialog()
						biEvents.closingDialog('SignUpDialog', displayMode)
						smPopups.rejectAuthenticationRequest()
					},
					async submit(email: string, password: string, submitOptions: ISignUpOptions | boolean) {
						// TODO: Since editor-elements will be GAing after the TB version we need to continue supporting
						// the 3rd attribute as `isCommunityChecked`, once we done we should remove it.
						let profilePrivacyStatus
						if (props.isCommunityInstalled) {
							const isCommunityChecked =
								typeof submitOptions === 'boolean' ? submitOptions : submitOptions.isCommunityChecked
							profilePrivacyStatus = isCommunityChecked ? PrivacyStatus.PUBLIC : PrivacyStatus.PRIVATE
						}
						const recaptchaToken = typeof submitOptions === 'boolean' ? undefined : submitOptions?.recaptchaToken
						logger.interactionStarted(INTERACTIONS.DEFAULT_SIGNUP)
						biEvents.emailAuthSubmitClicked('SignUpDialog', displayMode as string)
						return api
							.register(email, password, undefined, profilePrivacyStatus, true, returnPages, recaptchaToken, undefined)
							.then((registerResult) => {
								logger.interactionEnded(INTERACTIONS.DEFAULT_SIGNUP)
								const { member, sessionToken, pages } = registerResult
								if (sessionToken) {
									dialogService.hideDialog(true)
									resolve({ member, sessionToken, ...(returnPages ? { pages } : {}) })
								}
							})
							.catch((error) => {
								if (isSignupAcceptableError(error)) {
									logger.interactionEnded(INTERACTIONS.DEFAULT_SIGNUP)
								}

								throw error
							})
					},
					onSwitchDialogLinkClick() {
						api.showLoginDialog({ isCloseable, displayMode, returnPages }).then(resolve, () => {
							smPopups.rejectAuthenticationRequest()
						})
					},
					onBackendSocialLogin(data: IAMPlatformLoginResponse, vendor: string) {
						return api
							.handleSocialLoginResponse(
								data,
								vendor,
								returnPages,
								!!experiments['specs.thunderbolt.loadNewSessionCreatesCookie']
							)
							.then((loginResult) => {
								dialogService.hideDialog()
								resolve(loginResult)
							})
					},
					// Will be called by the component after mounting the social auth iframe to determine what to send inside via postMessage
					getHostReadyPayload: () => ({ visitorId: getBiVisitorId(), svSession }),
					openCaptcha: getOpenCaptcha({ captcha, userLanguage: language.userLanguage }),
					reportSocialAuthStarted,
				}
				biEvents.loginOrSignUpDialogLoaded('SignUpDialog', displayMode)
				await dialogService.displayDialog('SignUpDialog', props, actions)
				api.closeCustomAuthenticationDialogs(true)
			})
		},
		async hideAuthDialog() {
			// This function is supported only for document service to allow hiding the dialog by the editor
			console.warn('hideAuthDialog is not supported')
		},
		async showNotificationDialog(
			title: string,
			description: string,
			okButtonText: string,
			onOkButtonClick: () => void = () => 0,
			onCloseDialogCallback: () => void = () => 0
		) {
			const props = {
				isCloseable: true,
				title,
				description,
				okButtonText,
				translations,
			}
			const actions = {
				onCloseDialogCallback() {
					navigateBackToAuthorization(
						browserWindow,
						ssrCachedRequestUrl,
						shouldUseUrlFromBrowserWindowInsteadOfViewerModel
					)
					biEvents.closingDialog('NotificationDialog')
					dialogService.hideDialog()
					onCloseDialogCallback()
				},
				onOkButtonClick() {
					dialogService.hideDialog()
					onOkButtonClick()
				},
			}

			await dialogService.displayDialog('NotificationDialog', props, actions)
		},
		async showConfirmationEmailDialog(memberId: string, isSignUp = true) {
			return new Promise((_, reject) => {
				const props = {
					isCloseable: true,
					isSignUp,
					translations,
				}
				const actions = {
					onCloseDialogCallback() {
						navigateBackToAuthorization(
							browserWindow,
							ssrCachedRequestUrl,
							shouldUseUrlFromBrowserWindowInsteadOfViewerModel
						)
						biEvents.closingDialog('ConfirmationEmailDialog')
						dialogService.hideDialog()
						// We must reject both, since we might get here by promptLogin() or by simply register()
						smPopups.rejectAuthenticationRequest()
						reject(AUTH_RESULT_REASON.CANCELED)
					},
					async onResendConfirmationEmail() {
						await api.resendEmailVerification(memberId)
						await api.showConfirmationEmailDialog(memberId, false).catch(reject)
					},
				}

				dialogService.displayDialog('ConfirmationEmailDialog', props, actions)
			})
		},
		async showAdminApprovalDialog(email: string) {
			return new Promise((_, reject) => {
				const cancel = () => {
					navigateToAuthentication(
						browserWindow,
						ssrCachedRequestUrl,
						{ error: SSO_ERRORS.ACCESS_DENIED },
						shouldUseUrlFromBrowserWindowInsteadOfViewerModel
					)
					// We must reject both, since we might get here by promptLogin() or by simply register()
					smPopups.rejectAuthenticationRequest()
					reject(AUTH_RESULT_REASON.CANCELED)
					api.closeCustomAuthenticationDialogs(false)
				}
				api.showNotificationDialog(
					'',
					`${translations.applySuccess1} ${translations.applySuccess2}`.replace('{0}', email),
					translations.containerOk,
					cancel,
					cancel
				)
			})
		},
		async showAuthenticationDialog(pageId: string, returnPages: boolean = false): Promise<ExtendedLoginResult> {
			if (!popups) {
				throw new Error('popup unavailable')
			}

			return new Promise(async (resolve, reject) => {
				smPopups.assignRequestAuthenticationPromise(resolve, reject)
				const cbid = api.registerToUserLogin(async () => {
					smPopups.resolveAuthenticationRequest({
						member: memberDetails,
						sessionToken: savedSessionToken,
						...(returnPages
							? {
									pages: await api.authorizeMemberPagesBySignedInstance(getMetaSiteInstance()),
								}
							: {}),
					})
					api.unRegisterToUserLogin(cbid)
					if (popups.getCurrentLightboxId() === pageId) {
						popups.close()
					}
				}, 'customAuthCbId')
				await smPopups.openPopupPage(pageId, () => {
					api.unRegisterToUserLogin(cbid)
				})
				dialogService.hideDialog()
			})
		},
		async closeCustomAuthenticationDialogs(ignoreCallback = false) {
			const currentPopupPageId = popups?.getCurrentLightboxId()
			// Check both custom auth pages AND platformized TPA auth pages
			const authPageIds = [
				customSignUpPageId,
				customSignInPageId,
				tpaPageIds?.[TPA_PAGES.SIGN_UP],
				tpaPageIds?.[TPA_PAGES.LOGIN],
			].filter(Boolean)
			const isAuthPage = currentPopupPageId && authPageIds.includes(currentPopupPageId)
			if (isAuthPage) {
				if (ignoreCallback) {
					smPopups.preventCustomPopupCloseCallback()
				}
				await popups!.close()
				smPopups.allowCustomPopupCloseCallback()
			}
		},
		async showAdminApprovalDialogSMAuth(email: string, adminApprovalPageId: string) {
			return new Promise<ExtendedLoginResult>((_, reject) => {
				popups
					?.open(
						adminApprovalPageId,
						() => {
							navigateToAuthentication(browserWindow, ssrCachedRequestUrl, {
								error: SSO_ERRORS.ACCESS_DENIED,
							})
							// We must reject both, since we might get here by promptLogin() or by simply register()
							smPopups.rejectAuthenticationRequest()
							reject(AUTH_RESULT_REASON.CANCELED)
							api.closeCustomAuthenticationDialogs(false)
						},
						{ email }
					)
					.then(() => {
						dialogService.hideDialog(true)
					})
			})
		},
		async promptAdminApproval(email: string) {
			const adminApprovalPageId = tpaPageIds?.[TPA_PAGES.ADMIN_APPROVAL]
			if (shouldUsePlatformizedAuth && adminApprovalPageId) {
				return api.showAdminApprovalDialogSMAuth(email, adminApprovalPageId) as Promise<ExtendedLoginResult | void>
			}
			return api.showAdminApprovalDialog(email) as Promise<ExtendedLoginResult | void>
		},
		async promptExpiredResetLink(isCloseable: boolean = true) {
			const expiredTokenPageId = tpaPageIds?.[TPA_PAGES.EXPIRED_TOKEN]
			if (shouldUsePlatformizedAuth && expiredTokenPageId) {
				return router.navigate(`${prefixUrl}${TPA_PAGE_IDS_TO_ROUTES[TPA_PAGES.EXPIRED_TOKEN]}`)
			}
			api.showNotificationDialog(
				translations.passwordHasExpiredTitle,
				translations.passwordHasExpiredText,
				translations.passwordHasExpiredOk,
				() =>
					api.promptForgotPassword(isCloseable).then(() => {
						const url = urlHistoryManager.getParsedUrl()
						router.navigate(url.href)
					})
			)
		},
		async promptResetPassword() {
			const forgotPasswordToken = api.getForgotPasswordToken()

			// TODO: take care of the all the dialogs and behaviours that are triggered by
			// url, cookies, etc.
			if (forgotPasswordToken) {
				const resetPasswordPageId = tpaPageIds?.[TPA_PAGES.RESET_PASSWORD]
				if (shouldUsePlatformizedAuth && resetPasswordPageId) {
					return api.navigateToResetPasswordPage(forgotPasswordToken)
				}
				return api.showResetPasswordDialog(forgotPasswordToken)
			}
		},
		async promptEmailConfirmation() {
			const _stateToken = featureState.get().emailConfirmationStateToken
			const email = featureState.get().email
			const emailConfirmationPageId = tpaPageIds?.[TPA_PAGES.EMAIL_CONFIRMATION]
			if (shouldUsePlatformizedAuth && emailConfirmationPageId) {
				const verifyResult: StateMachineResponse = await new Promise<StateMachineResponse>((resolve) => {
					featureState.update((state) => ({
						...state,
						emailConfirmationStateToken: _stateToken ?? '',
					}))
					const closeHandler = () => {
						const emailConfirmationResponse = featureState.get().emailConfirmationResponse
						// If the lightbox was closed without completing verification,
						// emailConfirmationResponse will be undefined - re-show the signup dialog
						if (!emailConfirmationResponse) {
							this.promptLogin({ mode: 'signup' })
							return
						}
						if (
							emailConfirmationResponse.state !== StateType.SUCCESS &&
							emailConfirmationResponse.state !== StateType.REQUIRE_OWNER_APPROVAL
						) {
							this.promptLogin({ mode: 'signup' })
						}
						resolve(emailConfirmationResponse)
					}
					// Prevent the signup lightbox closeHandler from rejecting the authentication request
					// when the email confirmation lightbox opens and closes it
					smPopups.preventCustomPopupCloseCallback()
					popups?.open(emailConfirmationPageId, closeHandler, { email }).then(() => {
						dialogService.hideDialog(true)
					})
				})
				return this.getStateMachine(verifyResult, email)
			}
			const isVerificationCodeDialogNewLogic = experiments['specs.thunderbolt.verificationCodeDialogNewLogic']
			const stateToken = _stateToken ?? ''
			if (isVerificationCodeDialogNewLogic) {
				const verifyResult = await api.showVerificationCodeDialog({ email, stateToken })
				return api.getStateMachine(verifyResult as StateMachineResponse, email)
			}
			return api.recurciveEmailVerification(email, _stateToken!).then((verifyResult: StateMachineResponse) => {
				dialogService.hideDialog()
				return api.getStateMachine(verifyResult, email)
			})
		},
		async promptAuthPage<T extends TpaPage>(
			page: T,
			param?: TpaPageParams[T]
		): Promise<boolean | void | ExtendedLoginResult | StateMachineResponse> {
			switch (page) {
				case TpaPage.EXPIRED_RESET_LINK:
					return api.promptExpiredResetLink()
				case TpaPage.ADMIN_APPROVAL:
					if (typeof param !== 'string') {
						throw new Error('Email is required for ADMIN_APPROVAL')
					}
					return api.promptAdminApproval(param)
				case TpaPage.NO_PERMISSIONS:
					return api.showNoPermissionsToPageDialog(param as (() => void) | undefined)
				case TpaPage.LOGIN:
					return api.promptLogin(param as LoginOptions | undefined)
				case TpaPage.FORGOT_PASSWORD:
					return api.promptForgotPassword(param as boolean | undefined)
				case TpaPage.RESET_PASSWORD:
					return api.promptResetPassword()
				case TpaPage.EMAIL_CONFIRMATION:
					return api.promptEmailConfirmation()
				default:
					throw new Error(`Unknown auth page: ${page}`)
			}
		},
		getForgotPasswordToken() {
			const url = new URL(isSSR(browserWindow) ? ssrCachedRequestUrl : browserWindow.location.href)
			return url.searchParams.get('forgotPasswordToken')
		},
		shouldDisplayWelcomeDialog() {
			return sm_efCookie && isMemberInfoPage
		},
		async verifyEmail(code: string) {
			try {
				const stateToken = featureState.get().emailConfirmationStateToken
				const response = await httpClient.request(
					verifyDuringAuthentication({
						stateToken,
						code,
					}),
					{
						signedInstance: getMetaSiteInstance(),
					}
				)
				featureState.update((state) => ({
					...state,
					emailConfirmationResponse: response?.data,
				}))
			} catch (error) {
				const errorCode = getErrorCode(error.response?.data)
				throw errorCode
			}
		},
		async resendVerificationCodeEmail() {
			biEvents.siteMembersEmailConfirmationOnResendCodeClick()
			// Send new verification code
			const stateToken = featureState.get().emailConfirmationStateToken

			const response = await performFetch(`${stateMachineServiceUrl}/v1/proceed`, {
				method: 'POST',
				headers: {
					'Content-Type': 'application/json',
					authorization: getMetaSiteInstance(),
				},
				body: JSON.stringify({
					stateToken,
				}),
			})
			featureState.update((state) => ({
				...state,
				emailConfirmationStateToken: response.stateToken,
			}))
		},
		async showVerificationCodeDialog(
			verificationCodeProps: VerificationCodeProps,
			shouldKeepPrevDialog: boolean = true
		): Promise<StateMachineResponse | string | null> {
			const displayMode: CommonProps['displayMode'] = 'customPopup'
			return new Promise(async (resolve, reject) => {
				logger.interactionStarted(INTERACTIONS.VERIFICATION_CODE)
				biEvents.siteMembersEmailConfirmationNewMembersModalLoad()
				smPopups.assignRequestAuthenticationPromise(resolve, reject)
				// Initialize the feature state with the initial stateToken
				featureState.update((state) => ({
					...state,
					emailConfirmationStateToken: verificationCodeProps?.stateToken ?? '',
				}))
				const props = {
					language: language.userLanguage,
					directionByLanguage: language.directionByLanguage,
					isCloseable: smPopups.config?.isCloseable ?? true,
					displayMode,
					email: verificationCodeProps?.email,
					error: verificationCodeProps?.error,
					translations,
					isAuthV2Enabled: true,
					stateToken: verificationCodeProps?.stateToken,
					isVerificationCodeDialogNewLogic: experiments['specs.thunderbolt.verificationCodeDialogNewLogic'],
				}
				const actions = {
					async onResendVerificationCodeEmail() {
						biEvents.siteMembersEmailConfirmationOnResendCodeClick()
						// Send new verification code using the latest stateToken from feature state
						const currentStateToken = featureState.get().emailConfirmationStateToken
						const response = await performFetch(`${stateMachineServiceUrl}/v1/proceed`, {
							method: 'POST',
							headers: {
								'Content-Type': 'application/json',
								authorization: getMetaSiteInstance(),
							},
							body: JSON.stringify({
								stateToken: currentStateToken,
							}),
						})
						// Update the feature state with the new stateToken from the response
						featureState.update((state) => ({
							...state,
							emailConfirmationStateToken: response.stateToken,
						}))
					},
					onCloseDialogCallback() {
						biEvents.closingDialog('VerificationCode')
						navigateBackToAuthorization(
							browserWindow,
							ssrCachedRequestUrl,
							shouldUseUrlFromBrowserWindowInsteadOfViewerModel
						)
						dialogService.hideDialog()
						smPopups.rejectAuthenticationRequest()
						reject(AUTH_RESULT_REASON.CANCELED)
					},
					async onSubmitCallback(code: string) {
						biEvents.siteMembersEmailConfirmationSendCodeClick()
						const isVerificationCodeDialogNewLogic = experiments['specs.thunderbolt.verificationCodeDialogNewLogic']
						if (isVerificationCodeDialogNewLogic) {
							try {
								// Use the latest stateToken from feature state
								const currentStateToken = featureState.get().emailConfirmationStateToken
								const payload = {
									stateToken: currentStateToken || '',
									code,
								}
								const response = await httpClient.request(verifyDuringAuthentication(payload), {
									signedInstance: getMetaSiteInstance(),
								})
								return response?.data
							} catch (error) {
								const errorCode = getErrorCode(error.response?.data)
								if (errorCode === AUTH_RESULT_REASON.CANCELED) {
									return reject(errorCode)
								}
								throw errorCode
							}
						}
						resolve(code)
					},
					onSuccessCallback: (response: StateMachineResponse) => {
						dialogService.hideDialog()
						resolve(response)
					},
				}
				logger.interactionEnded(INTERACTIONS.VERIFICATION_CODE)
				dialogService.displayDialog('VerificationCodeDialog', props, actions, shouldKeepPrevDialog)
			})
		},
		async appWillMount() {
			if (loginSocialBarOnSite) {
				await api.getMemberDetails()
			}
			const url = new URL(viewerModel.requestUrl)
			// Enable forcing dialogs for testing and debugging purposes
			switch (url.searchParams.get('showDialog')) {
				case 'MemberLoginDialogV2':
					await api.showLoginDialogWithExternalPromise()
					break
				case 'MemberLoginDialog':
					api.showLoginDialog()
					break
				case 'SignUpDialog':
					api.showSignUpDialog()
					break
				case 'RequestPasswordResetDialog':
					api.promptForgotPassword()
					break
				case 'ResetPasswordDialog':
					api.showResetPasswordDialog('faketoken')
					break
				case 'LoggedInResetPasswordDialog':
					api.showLoggedInResetPasswordDialog()
					break
				case 'WelcomeDialog':
					api.showWelcomeDialog()
					break
				case 'NoPermissionsToPageDialog':
					api.showNoPermissionsToPageDialog()
					break
				case 'NotificationDialog':
					api.showNotificationDialog('title', 'description', 'ok')
					break
				case 'ConfirmationEmailDialog':
					api.showConfirmationEmailDialog('fakemember')
					break
				case 'VerificationCodeDialog':
					api.showVerificationCodeDialog({
						email: 'testEmail@test.com',
					})
					break
				case 'ExpiredResetPasswordDialog':
					api.showNotificationDialog(
						translations.passwordHasExpiredTitle,
						translations.passwordHasExpiredText,
						translations.passwordHasExpiredOk,
						() =>
							api.promptForgotPassword(false).then(() => {
								const _url = urlHistoryManager.getParsedUrl()
								router.navigate(_url.href)
							})
					)
					break
				default:
					break
			}
		},
		pageWillUnmount({ pageId }: { pageId: string }) {
			// We usually hide our dialogs on navigation. This lets us get out of the way in case
			// the visitor backs out of a protected page, navigates from the sign up dialog
			// to one of the policy pages, etc.
			// However, if we're using any custom forms, we mustn't treat their closure as a navigation
			// event, even though TB lifecycle does. This may lead to dialogs we intentionally opened
			// (eg. email approval dialog at the end of registration) being unintentionally closed.
			if (![customSignUpPageId, customSignInPageId].includes(pageId)) {
				dialogService.hideDialog()
			}
		},
		getSocialAuthComponentProps(): SocialAuthComponentProps {
			return _getSocialAuthComponentProps({
				config: siteFeatureConfig,
				viewerModel,
				sessionManager,
				bsiManager,
				handleSocialLoginResponse: api.handleSocialLoginResponse,
				isSocialAuthSupported: isCustomLoginSocialAuthSupported,
				captcha,
				userLanguage: language.userLanguage,
				reportBi: businessLogger.reportBi,
				reportSocialAuthStarted,
				useNewSocialFlow: true,
				translations,
			})
		},
		async getConnections() {
			// In the future we may want to override the enabled connections with settings set on the document,
			// in order to enable more fine grained control over what we display as opposed to what's generally
			// available. Right now this feature isn't ready.
			const overrides = {
				[KNOWN_CONNECTION_APPEFIDS.FACEBOOK]: true, // socialLoginFacebookEnabled,
				[KNOWN_CONNECTION_APPEFIDS.GOOGLE]: true, // socialLoginGoogleEnabled,
				[KNOWN_CONNECTION_APPEFIDS.APPLE]: !!experiments['specs.thunderbolt.enableAppleLogin'],
			}

			return siteMembersSettingsService.getEnabledConnections(overrides).then((connections) =>
				connections.map(({ id, appDefId, displayName }) => ({
					id,
					appDefId,
					name: displayName,
				}))
			)
		},
		getLoginUrl() {
			if (clientId && experiments['specs.thunderbolt.shouldFetchLoginUrlByClientId']) {
				return siteMembersSettingsService.getLoginRedirectUrl()
			}
		},
		getLogoutUrl() {
			if (clientId) {
				return siteMembersSettingsService.getLogoutRedirectUrl()
			}
		},
		getRouterPrefix() {
			return routerPrefix
		},
		getExternalBaseUrl() {
			return experiments['specs.thunderbolt.shouldUseExternalBaseUrl'] ? externalBaseUrl : undefined
		},
		async register(
			email: string,
			password: string,
			contactInfo?: IContactInfo,
			profilePrivacyStatus?: PrivacyStatus,
			isDefaultFlow?: boolean,
			returnPages?: boolean,
			recaptchaToken?: string,
			emailVerification?: IEmailVerification,
			clientMetaData?: Record<string, any>,
			invisibleRecaptchaTokenFromCaller?: string | null
		): Promise<ExtendedRegisterResult> {
			returnPages = returnPages ?? false
			try {
				const captchaSettings = await siteMembersSettingsService.getCaptchaSettings()
				// We wish to prevent calls to the server since we already know the captcha is required
				if (
					captchaSettings.visible.signup &&
					experiments['specs.ShouldPassCaptchaVerificationOnSignupSpec'] !== 'Enabled' &&
					!recaptchaToken &&
					!emailVerification?.otp &&
					!emailVerification?.verificationId
				) {
					throw CAPTCHA_REQUIRED_RESPONSE
				}
				logger.interactionStarted(INTERACTIONS.CODE_SIGNUP)
				reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.SIGNUP.SUBMIT))
				const currentPopupId = popups?.getCurrentLightboxId()
				const currentPageId = currentRouteInfo.getCurrentRouteInfo()?.pageId
				// Legally, in order to use invisible captcha we need terms of use to be shown, the terms
				// are shown only when the login/signup pages are open
				const isRequestIncomingFromSignupPage =
					isDefaultFlow ||
					(customSignUpPageId && currentPopupId && customSignUpPageId === currentPopupId) ||
					(customSignUpPageId && currentPageId && customSignUpPageId === currentPageId)
				// Use caller-provided invisible token if available, otherwise try to fetch internally
				const invisibleRecaptchaToken: string | undefined =
					invisibleRecaptchaTokenFromCaller ||
					(captchaSettings.invisible.signup && isRequestIncomingFromSignupPage
						? await getInvisibleCaptchaToken(AUTH_METHODS.SIGNUP)
						: undefined)
				const shouldConvertBirthdate: boolean = experiments['specs.thunderbolt.convertBirthdateToISOString'] as boolean
				const shouldMapFullContactInfoToIdentityProfile: boolean = experiments[
					'specs.thunderbolt.shouldMapFullContactInfoToIdentityProfile'
				] as boolean
				const body = {
					profile: {
						...serializeIdentityProfile(
							contactInfo || {},
							shouldConvertBirthdate,
							shouldMapFullContactInfoToIdentityProfile
						),
						privacyStatus: profilePrivacyStatus,
						emails: [email],
					},
					loginId: { email },
					password,
					clientMetaData,
					captchaTokens: [
						...(recaptchaToken
							? [
									{
										Recaptcha: recaptchaToken,
									},
								]
							: []),
						...(invisibleRecaptchaToken
							? [
									{
										InvisibleRecaptcha: invisibleRecaptchaToken,
									},
								]
							: []),
					],
				} as RegisterV2Request
				const result = await httpClient
					.request(registerV2(body), { signedInstance: getMetaSiteInstance() })
					.then((res: { data: StateMachineResponse }) => res.data)
					.catch((error) => {
						throw error.response?.data ?? error
					})

				logger.interactionEnded(INTERACTIONS.CODE_SIGNUP)
				const stateMachine = await api.getStateMachine(result, email)
				const protectedPages = stateMachine?.additionalData?.protectedPages as any
				const pagesFromIAM = toAuthorizedPages(protectedPages)
				const memberData = memberDetailsFromIAMResponseV2(stateMachine)

				const redirected = navigateToAuthentication(
					browserWindow,
					ssrCachedRequestUrl,
					{
						sessionToken: stateMachine?.sessionToken!,
					},
					shouldUseUrlFromBrowserWindowInsteadOfViewerModel
				)
				if (redirected && experiments['specs.thunderbolt.useNewPostLoginRedirect']) {
					return hangingPromise()
				}

				const pages = await api.applySessionToken(stateMachine?.sessionToken!, memberData, returnPages && !pagesFromIAM)
				const resolvedPages = pagesFromIAM ?? pages

				reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.SIGNUP.SUCCESS))
				reporter.trackEvent({
					eventName: 'CompleteRegistration',
					params: {
						origin: 'Site members',
						method: 'Wix',
					},
				})
				const sessionToken = stateMachine?.sessionToken!
				return {
					member: memberData,
					status: memberData.status,
					sessionToken,
					...(returnPages && resolvedPages ? { pages: resolvedPages } : {}),
				}
			} catch (error) {
				if (isSignupAcceptableError(error)) {
					logger.interactionEnded(INTERACTIONS.CODE_SIGNUP)
				} else {
					reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.SIGNUP.FAIL))
				}

				throw error
			}
		},
		async getStateMachine(response: StateMachineResponse, email: string): Promise<StateMachineResponse> {
			const memberState = response?.state
			// In case member need to wait for admin approval
			if (memberState === StateType.REQUIRE_OWNER_APPROVAL) {
				if (shouldUsePlatformizedAuth) {
					const adminApprovalPageId = tpaPageIds![TPA_PAGES.ADMIN_APPROVAL]
					if (adminApprovalPageId) {
						return new Promise<ExtendedLoginResult>((_, reject) => {
							// Prevent the signup popup's close callback from firing when it is
							// replaced by the approval popup. Without this, smPopups sees the
							// signup popup closing and calls rejectAuthenticationRequest(), which
							// rejects the promptLogin promise and causes the platform to
							// re-trigger the signup flow — replacing the approval popup with
							// the signup form again (ID-2436).
							smPopups.preventCustomPopupCloseCallback()
							popups
								?.open(
									adminApprovalPageId,
									() => {
										navigateToAuthentication(
											browserWindow,
											ssrCachedRequestUrl,
											{
												error: SSO_ERRORS.ACCESS_DENIED,
											},
											shouldUseUrlFromBrowserWindowInsteadOfViewerModel
										)
										// We must reject both, since we might get here by promptLogin() or by simply register()
										smPopups.rejectAuthenticationRequest()
										reject(AUTH_RESULT_REASON.CANCELED)
										api.closeCustomAuthenticationDialogs(false)
									},
									{ email }
								)
								.then(() => {
									dialogService.hideDialog(true)
								})
						})
					}
				}
				return api.showAdminApprovalDialog(email) as Promise<ExtendedLoginResult>
			}
			// In case member need to wait for email verification
			if (memberState === StateType.REQUIRE_EMAIL_VERIFICATION) {
				if (shouldUsePlatformizedAuth) {
					const emailConfirmationPageId = tpaPageIds![TPA_PAGES.EMAIL_CONFIRMATION]
					if (emailConfirmationPageId) {
						const verifyResult: StateMachineResponse = await new Promise<StateMachineResponse>((resolve) => {
							featureState.update((state) => ({
								...state,
								emailConfirmationStateToken: response?.stateToken ?? '',
							}))
							const closeHandler = () => {
								const emailConfirmationResponse = featureState.get().emailConfirmationResponse
								// If the lightbox was closed without completing verification (e.g., user closed it manually),
								// emailConfirmationResponse will be undefined - re-show the signup dialog
								if (!emailConfirmationResponse) {
									this.promptLogin({ mode: 'signup' })
									return
								}
								if (
									emailConfirmationResponse.state !== StateType.SUCCESS &&
									emailConfirmationResponse.state !== StateType.REQUIRE_OWNER_APPROVAL
								) {
									this.promptLogin({ mode: 'signup' })
								}
								resolve(emailConfirmationResponse)
							}
							// Prevent the signup lightbox closeHandler from rejecting the authentication request
							// when the email confirmation lightbox opens and closes it
							smPopups.preventCustomPopupCloseCallback()
							popups?.open(emailConfirmationPageId, closeHandler, { email }).then(() => {
								dialogService.hideDialog(true)
							})
						})
						return this.getStateMachine(verifyResult, email)
					}
				}
				const isVerificationCodeDialogNewLogic = experiments['specs.thunderbolt.verificationCodeDialogNewLogic']
				const stateToken = response?.stateToken ?? ''
				if (isVerificationCodeDialogNewLogic) {
					const verifyResult = await api.showVerificationCodeDialog({ email, stateToken })
					return api.getStateMachine(verifyResult as StateMachineResponse, email)
				}
				return api
					.recurciveEmailVerification(email, response?.stateToken!)
					.then((verifyResult: StateMachineResponse) => {
						dialogService.hideDialog()
						return api.getStateMachine(verifyResult, email)
					})
			}
			return response
		},
		async recurciveEmailVerification(
			email: string,
			stateToken: string,
			retry?: boolean,
			errorCode?: string,
			otpCode?: string
		): Promise<StateMachineResponse> {
			try {
				const otp = otpCode ?? (await api.showVerificationCodeDialog({ email, stateToken, error: errorCode }, !retry))
				// Use the latest stateToken from feature state (may have been updated by resend)
				const currentStateToken = featureState.get().emailConfirmationStateToken || stateToken
				const payload = {
					stateToken: currentStateToken || '',
					code: otp as string,
				}

				const response = await httpClient.request(verifyDuringAuthentication(payload), {
					signedInstance: getMetaSiteInstance(),
				})

				return response.data
			} catch (error) {
				if (error === AUTH_RESULT_REASON.CANCELED) {
					throw error
				}
				const _errorCode = error?.details?.applicationError?.code ?? 'BAD_CODE'
				// Recursive call to retry the verification - use current stateToken from feature state
				const currentStateToken = featureState.get().emailConfirmationStateToken || stateToken
				return api.recurciveEmailVerification(email, currentStateToken, true, _errorCode)
			}
		},
		async login(
			email: string,
			password: string,
			options?: ILoginOptions,
			returnPages: boolean = false,
			emailVerification?: IEmailVerification,
			isDefaultFlow: boolean = false
		): Promise<ExtendedLoginResult> {
			try {
				const captchaSettings = await siteMembersSettingsService.getCaptchaSettings()
				// We wish to prevent calls to the server since we already know the captcha is required
				if (
					captchaSettings.visible.login &&
					!options?.recaptchaToken &&
					!emailVerification?.otp &&
					!emailVerification?.verificationId
				) {
					throw CAPTCHA_REQUIRED_RESPONSE
				}
				reporter.trackEvent(getTrackEventParams(TRACK_EVENTS.ACTIONS.LOGIN.SUBMIT))

				const currentPopupId = popups?.getCurrentLightboxId()
				const currentPageId = currentRouteInfo.getCurrentRouteInfo()?.pageId
				const isRequestIncomingFromLoginPage =
					isDefaultFlow ||
					(customSignInPageId && currentPopupId && customSignInPageId === currentPopupId) ||
					(customSignInPageId && currentPageId && customSignInPageId === currentPageId)
				const invisibleRecaptchaToken =
					options?.invisibleRecaptchaToken ||
					(captchaSettings.invisible.login && isRequestIncomingFromLoginPage
						? await getInvisibleCaptchaToken(AUTH_METHODS.LOGIN)
						: undefined)
				const captchaTokens: Array<CaptchaToken> = []
				if (options?.recaptchaToken) {
					captchaTokens.push({
						Recaptcha: options?.recaptchaToken,
					})
				}
				if (invisibleRecaptchaToken) {
					captchaTokens.push({
						InvisibleRecaptcha: invisibleRecaptchaToken,
					})
				}
				const loginRequest = {
					loginId: { email },
					password,
					captchaTokens,
				} as LoginV2Request
				const result = await httpClient
					.request(loginV2(loginRequest), {
						signedInstance: getMetaSiteInstance(),
					})
					.then((res) => res.data as StateMachineResponse)
					.catch((error) => {
						throw error.response?.data ?? error
					})

				const stateMachine = await api.getStateMachine(result, email)
				const protectedPages = stateMachine?.additionalData?.protectedPages as any
				const pagesFromIAM = toAuthorizedPages(protectedPages)
				const memberData = memberDetailsFromIAMResponseV2(stateMachine)

				const redirected = navigateToAuthentication(
					browserWindow,
					ssrCachedRequestUrl,
					{
						sessionToken: stateMachine?.sessionToken!,
					},
					shouldUseUrlFromBrowserWindowInsteadOfViewerModel
				)
				if (redirected && experiments['specs.thunderbolt.useNewPostLoginRedirect']) {
					return hangingPromise()
				}

				const returnedPages = (await api.applySessionToken(
					stateMachine?.sessionToken!,
					memberData,
					returnPages && !pagesFromIAM
				)) as AuthorizedPages
				const resolvedPages = pagesFromIAM ?? returnedPages
				// TODO: I'm not sure it's right, I think `INTERACTIONS.DEFAULT_SIGNUP reach here as well.
				const sessionToken = stateMachine?.sessionToken!
				return {
					sessionToken,
					member: memberData!,
					...(returnPages ? { pages: resolvedPages } : {}),
				}
			} catch (error) {
				if (!isLoginAcceptableError(error)) {
					reporter.trackEvent({
						eventName: 'CustomEvent',
						params: {
							eventCategory: 'Site members',
							eventAction: 'Log in Failure',
							eventLabel: 'Wix',
						},
					})
				}
				if (error?.details?.applicationError?.code === ERROR_CODES.WAITING_APPROVAL) {
					api.showAdminApprovalDialog(email)
				}
				throw error?.response?.data ?? error
			}
		},
		async loginWithIdp(idpConnectionId: string, joinCommunity?: boolean): Promise<LoginResult> {
			if (isSSR(browserWindow)) {
				throw NOT_PERMITTED
			}

			reportSocialAuthStarted(idpConnectionId)

			const loginResponse = await openIdpPopup(
				idpConnectionId,
				getBiVisitorId(),
				bsi,
				svSession,
				metaSiteId,
				joinCommunity ?? joinCommunityCheckedByDefault
			)

			return api.handleSocialLoginResponse(
				loginResponse,
				idpConnectionId,
				false,
				!!experiments['specs.thunderbolt.loadNewSessionCreatesCookie']
			)
		},
		async getSettings(): Promise<CombinedCollectionSettings> {
			return siteMembersSettingsService.getCombinedCollectionSettings()
		},
	}

	siteMembersExports.export({
		promptLogin: api.promptLogin,
		logout: api.logout,
		memberDetails,
	})

	featureState.update((state) => ({
		...state,
		shouldShowRenderingBlockingDialogs: (routeInfo: Partial<CandidateRouteInfo>) => {
			if (routeInfo.relativeUrl === RESET_PASSWORD_ROUTE) {
				return false
			}
			return !!(api.getForgotPasswordToken() || api.shouldDisplayWelcomeDialog())
		},
		showRenderingBlockingDialogs: () => {
			const forgotPasswordToken = api.getForgotPasswordToken()

			// TODO: take care of the all the dialogs and behaviours that are triggered by
			// url, cookies, etc.
			if (forgotPasswordToken) {
				if (shouldUsePlatformizedAuth) {
					return api.navigateToResetPasswordPage(forgotPasswordToken)
				}
				return api.showResetPasswordDialog(forgotPasswordToken)
			}
			if (api.shouldDisplayWelcomeDialog()) {
				return api.showWelcomeDialog()
			}
		},
	}))
	// TS incorrectly infers that the `applySessionToken` implementation above (which supports
	// an optional return type if an undocumented argument is applied) is incompatible with the
	// declared type.
	// This omit+union operation forces TS to accept `applySessionToken` as correct while still
	// typechecking the rest of the object.
	return api as Omit<typeof api, 'applySessionToken'> & { applySessionToken: ISiteMembersApi['applySessionToken'] }
}

const clearCookie = (cookieName: string, path: string, domain: string) => {
	document.cookie = `${cookieName}=;max-age=0`
	document.cookie = `${cookieName}=;max-age=0;path=${path}`
	document.cookie = `${cookieName}=;domain=${domain};max-age=0`
	document.cookie = `${cookieName}=;domain=${domain};max-age=0;path=${path}`
}

export const SiteMembersApi = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		named(FeatureStateSymbol, name),
		named(FeatureExportsSymbol, name),
		Fetch,
		LoggerSymbol,
		ViewerModelSym,
		SessionManagerSymbol,
		Props,
		StructureAPI,
		LanguageSymbol,
		BrowserWindowSymbol,
		Router,
		optional(SiteScrollBlockerSymbol),
		UrlHistoryManagerSymbol,
		BusinessLoggerSymbol,
		WixBiSessionSymbol,
		optional(LightboxSymbol),
		SMPopupsSymbol,
		CurrentRouteInfoSymbol,
		ExperimentsSymbol,
		optional(ReporterSymbol),
		optional(CaptchaApiSymbol),
		optional(CyclicTabbingSymbol),
		optional(BsiManagerSymbol),
		optional(MultilingualSymbol),
	],
	siteMembersApi
)
