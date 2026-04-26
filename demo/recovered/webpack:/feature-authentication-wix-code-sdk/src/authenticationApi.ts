import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ICaptchaDialog, ICaptchaApi } from '@wix/thunderbolt-commons'
import { getOpenCaptcha, getWithCaptchaChallengeHandler } from '@wix/thunderbolt-commons'
import type { ILanguage } from '@wix/thunderbolt-symbols'
import { LanguageSymbol, CaptchaApiSymbol } from '@wix/thunderbolt-symbols'

export const AuthenticationApi = withDependencies(
	[CaptchaApiSymbol, LanguageSymbol],
	(captcha: ICaptchaApi, language: ILanguage): ICaptchaDialog => {
		const openCaptchaDialog = getOpenCaptcha({ captcha, userLanguage: language.userLanguage })
		const api: ICaptchaDialog = {
			openCaptchaDialog,
			withCaptchaChallengeHandler: getWithCaptchaChallengeHandler({ openCaptchaDialog }),
		}
		return api
	}
)
