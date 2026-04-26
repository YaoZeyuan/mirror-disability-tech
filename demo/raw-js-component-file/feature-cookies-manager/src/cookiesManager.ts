import { withDependencies, named } from '@wix/thunderbolt-ioc'
import { SiteFeatureConfigSymbol, ConsentPolicySymbol } from '@wix/thunderbolt-symbols'
import type { CookiesManagerSiteConfig, ICookiesManager } from './types'
import { name } from './symbols'
import type { IConsentPolicy } from 'feature-consent-policy'
import type { ConsentPolicyKey } from '@wix/cookie-consent-policy-client'
import type { CookieAttributes } from 'js-cookie'
import { set as setCookie, remove as removeCookie } from 'js-cookie'

const noopify = (): ICookiesManager => ({
	writeCookie() {},
})

const cookiesManagerFactory = (
	siteFeatureConfig: CookiesManagerSiteConfig,
	consntetPolicy: IConsentPolicy
): ICookiesManager => {
	const isWriteCookieAllowed = (policyKey: ConsentPolicyKey) => {
		const { policy } = consntetPolicy.getCurrentConsentPolicy()
		return policy[policyKey]
	}
	const { cookieSitePath, cookieSiteDomain } = siteFeatureConfig
	return {
		writeCookie(
			key: string,
			value: string,
			policy: ConsentPolicyKey,
			{ daysExpire = 99, sessionCookie = false, sameSite = 'strict', path = cookieSitePath, domain = cookieSiteDomain }
		) {
			const options: CookieAttributes = {
				expires: sessionCookie ? undefined : daysExpire,
				path,
				domain,
				sameSite,
				secure: true,
			}
			if (isWriteCookieAllowed(policy)) {
				setCookie(key, value, options)
			} else {
				removeCookie(key, options)
			}
		},
	}
}

export const CookiesManager = withDependencies(
	[named(SiteFeatureConfigSymbol, name), ConsentPolicySymbol],
	cookiesManagerFactory
)

export const CookiesManagerNoopified = withDependencies([], noopify)
