import { withDependencies, named, optional } from '@wix/thunderbolt-ioc'
import type { BrowserWindow, Experiments, IAppWillMountHandler, IHeadContent } from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	ExperimentsSymbol,
	SiteFeatureConfigSymbol,
	HeadContentSymbol,
} from '@wix/thunderbolt-symbols'
import type { IMpaNavigation } from 'feature-mpa-navigation'
import { MpaNavigationSymbol } from 'feature-mpa-navigation'
import type { SpeculationRulesSiteConfig, SpeculationRulesConfig, SpeculationRule } from './types'
import { name } from './symbols'

const PRERENDER_UNTIL_SCRIPT_ORIGIN_TRIAL_TOKEN =
	'A/VAet/bEjA4ln7DXeiHQE7cBUrzS4f9Qz45yc8fguKgPEio2/c/rEzqRnIPfbgp49o+M2MFkhRKy9Z7LKGPowUAAACLeyJvcmlnaW4iOiJodHRwczovL3N0YXRpYy5wYXJhc3RvcmFnZS5jb206NDQzIiwiZmVhdHVyZSI6IlByZXJlbmRlclVudGlsU2NyaXB0IiwiZXhwaXJ5IjoxNzg4ODI1NjAwLCJpc1N1YmRvbWFpbiI6dHJ1ZSwiaXNUaGlyZFBhcnR5Ijp0cnVlfQ=='

/**
 * Adds speculation rules to the head when MPA navigation is eligible.
 * - Prefetch rules are added during SSR (inlined in HTML)
 * - prerender_until_script rules are added client-side only, after registering
 *   the origin trial token to ensure the browser recognizes the experimental feature
 */
export const SpeculationRules = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		HeadContentSymbol,
		optional(MpaNavigationSymbol),
		BrowserWindowSymbol,
		ExperimentsSymbol,
	],
	(
		siteFeatureConfig: SpeculationRulesSiteConfig,
		headContent: IHeadContent,
		mpaNavigation: IMpaNavigation | undefined,
		window: BrowserWindow,
		experiments: Experiments
	): IAppWillMountHandler => {
		return {
			async appWillMount() {
				const isMpaEligible = mpaNavigation?.isEligible() ?? false
				if (!isMpaEligible) {
					return
				}

				const isEager = !!experiments['specs.thunderbolt.EagerSpeculationRules']
				const eagerness = isEager ? 'eager' : 'moderate'
				const prefetchTag = isEager ? 'mpa-prefetch-eager' : 'mpa-prefetch-moderate'

				const baseRule: SpeculationRule = {
					where: {
						and: [{ href_matches: '/*' }, { not: { href_matches: `${siteFeatureConfig.currentPagePath}` } }],
					},
					eagerness,
				}

				// Add prefetch rules (works in both SSR and client)
				const prefetchConfig: SpeculationRulesConfig = {
					prefetch: [{ tag: prefetchTag, ...baseRule }],
				}
				headContent.setHead(`<script type="speculationrules">${JSON.stringify(prefetchConfig)}</script>`)

				// Skip prerender_until_script in SSR - must be added client-side after origin trial token
				if (!window) {
					return
				}

				// Add prerender_until_script rules client-side when experiment is enabled
				if (experiments['specs.thunderbolt.usePrerenderUntilScript']) {
					const prerenderTag = isEager ? 'mpa-prerender-script-eager' : 'mpa-prerender-script-moderate'

					// Register origin trial token first
					const tokenElement = window.document.createElement('meta')
					tokenElement.httpEquiv = 'origin-trial'
					tokenElement.content = PRERENDER_UNTIL_SCRIPT_ORIGIN_TRIAL_TOKEN
					window.document.head.appendChild(tokenElement)

					// Then add prerender_until_script speculation rules
					const prerenderConfig: SpeculationRulesConfig = {
						prerender_until_script: [{ tag: prerenderTag, ...baseRule }],
					}
					const script = window.document.createElement('script')
					script.type = 'speculationrules'
					script.textContent = JSON.stringify(prerenderConfig)
					window.document.head.appendChild(script)
				}
			},
		}
	}
)
