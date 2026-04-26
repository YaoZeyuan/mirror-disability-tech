import { withDependencies } from '@wix/thunderbolt-ioc'
import { BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import { isSSR } from '@wix/thunderbolt-commons'
import type { IShouldNavigateHandler } from 'feature-router'

export const ShouldNavigateHandler = withDependencies(
	[BrowserWindowSymbol] as const,
	(window): IShouldNavigateHandler => {
		return {
			shouldNavigate: () => {
				return !isSSR(window)
			},
		}
	}
)
