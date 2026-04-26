import { withDependencies } from '@wix/thunderbolt-ioc'
import type { SdkHandlersProvider, ILogger, ISessionManager } from '@wix/thunderbolt-symbols'
import { LoggerSymbol, AppDidMountPromiseSymbol } from '@wix/thunderbolt-symbols'
import type { SiteMembersWixCodeSdkHandlers } from '../types'
import type { ISiteMembersApi } from 'feature-site-members'
import { SiteMembersApiSymbol, PrivacyStatus, INTERACTIONS, isLoginAcceptableError } from 'feature-site-members'
import { SessionManagerSymbol } from 'feature-session-manager'
import { name } from '../symbols'

export const siteMembersWixCodeSdkHandlers = withDependencies(
	[SiteMembersApiSymbol, LoggerSymbol, AppDidMountPromiseSymbol, SessionManagerSymbol],
	(
		{
			login,
			promptLogin,
			promptForgotPassword,
			applySessionToken,
			getMemberDetails,
			register,
			registerToUserLogin,
			unRegisterToUserLogin,
			registerToMemberLogout,
			unRegisterToMemberLogout,
			logout,
			closeCustomAuthenticationDialogs,
			sendSetPasswordEmail,
			sendForgotPasswordMail,
			sendResetPasswordEmail,
			verifyEmail,
			resendVerificationCodeEmail,
			sendEmailVerification,
			changePassword,
			loginWithIdp,
			promptAuthPage,
			getSettings,
		}: ISiteMembersApi,
		logger: ILogger,
		appDidMountPromise: Promise<unknown>,
		sessionManager: ISessionManager
	): SdkHandlersProvider<SiteMembersWixCodeSdkHandlers> => ({
		getSdkHandlers: () => ({
			[name]: {
				async login(email, password, options) {
					try {
						logger.interactionStarted(INTERACTIONS.CODE_LOGIN)
						const response = await login(email, password, options)
						logger.interactionEnded(INTERACTIONS.CODE_LOGIN)

						// In case someone opened the custom login popup using the popup API
						// we still wish to close the popup on a successful login
						closeCustomAuthenticationDialogs(true).catch((e) =>
							logger.captureError(e as Error, { tags: { feature: 'site-members' } })
						)
						return response
					} catch (error) {
						if (isLoginAcceptableError(error)) {
							logger.interactionEnded(INTERACTIONS.CODE_LOGIN)
						}

						throw error
					}
				},
				applySessionToken,
				promptForgotPassword,
				async promptLogin(options) {
					await appDidMountPromise
					const loginResult = await promptLogin(options)
					return loginResult?.member
				},
				async register(email, password, options) {
					// We wish to allow consumers to manage the captcha by themselves
					const { member, approvalToken, status } = await register(
						email,
						password,
						options?.contactInfo,
						options.privacyStatus || PrivacyStatus.PRIVATE,
						undefined,
						undefined,
						options?.recaptchaToken,
						undefined,
						options?.clientMetaData,
						options?.invisibleRecaptchaToken
					)

					return {
						status,
						approvalToken,
						user: member,
					}
				},
				loginWithIdp,
				registerToUserLogin,
				unRegisterToUserLogin,
				registerToMemberLogout,
				unRegisterToMemberLogout,
				sendSetPasswordEmail,
				sendForgotPasswordMail,
				sendResetPasswordEmail,
				verifyEmail,
				resendVerificationCodeEmail,
				changePassword,
				sendEmailVerification,
				logout,
				getMemberDetails,
				getVisitorId: () => sessionManager.getVisitorId(),
				promptAuthPage,
				getSettings,
			},
		}),
	})
)
