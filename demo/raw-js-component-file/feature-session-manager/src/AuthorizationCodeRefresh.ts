import type { IWindowMessageRegistrar } from 'feature-window-message-registrar'
import { WindowMessageRegistrarSymbol } from 'feature-window-message-registrar'
import type { ISessionManager } from '@wix/thunderbolt-symbols'
import { SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { parseMessage } from '@wix/thunderbolt-commons'
import { isSiteContextOverrideMessage } from './dynamicModelUtils'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import { name, SessionManagerSymbol } from './symbols'
import type { SessionManagerSiteConfig } from './types'

export const AuthorizationCodeRefresh = withDependencies(
	[SessionManagerSymbol, named(SiteFeatureConfigSymbol, name), optional(WindowMessageRegistrarSymbol)],
	(
		sessionManager: ISessionManager,
		{ isRunningInDifferentSiteContext }: SessionManagerSiteConfig,
		windowMessageRegistrar?: IWindowMessageRegistrar
	) => {
		if (!isRunningInDifferentSiteContext) {
			return
		}

		windowMessageRegistrar?.addWindowMessageHandler({
			canHandleEvent: (event: MessageEventInit) => !!event.source && isSiteContextOverrideMessage(parseMessage(event)),
			handleEvent: (event: MessageEventInit) => {
				const originalMessage = parseMessage(event)
				const { authorizationCode } = originalMessage

				void sessionManager.loadNewSession({ reason: 'authorization code expiry', authorizationCode })
			},
		})
	}
)
