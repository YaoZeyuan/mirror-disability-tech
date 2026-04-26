import { withDependencies } from '@wix/thunderbolt-ioc'
import { BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import { isSSR } from '@wix/thunderbolt-commons'
import type { IShouldEnableTriggersAndReactions } from './types'

export const ShouldEnableTriggersAndReactions = withDependencies(
	[BrowserWindowSymbol] as const,
	(browserWindow): IShouldEnableTriggersAndReactions => {
		return {
			shouldEnableTriggersAndReactions: !isSSR(browserWindow),
		}
	}
)
