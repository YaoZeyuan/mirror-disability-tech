import { withDependencies } from '@wix/thunderbolt-ioc'
import { BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import { isSSR } from '@wix/thunderbolt-commons'
import type { SpeculationRulesConfig, ISpeculationRules } from './types'

export const SpeculationRulesApi = withDependencies([BrowserWindowSymbol], (window): ISpeculationRules => {
	return {
		prefetchPages: (urls: string[]) => {
			if (isSSR(window)) {
				return
			}

			if (urls.length === 0) {
				return
			}

			const script = window.document.createElement('script')
			script.type = 'speculationrules'

			const speculationRulesConfig: SpeculationRulesConfig = {
				prefetch: [
					{
						tag: 'mpa-prefetch-pages-api',
						urls,
						eagerness: 'immediate',
					},
				],
			}

			script.textContent = JSON.stringify(speculationRulesConfig)
			window.document.head.appendChild(script)
		},
	}
})
