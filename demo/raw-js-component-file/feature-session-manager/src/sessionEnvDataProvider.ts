import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { PlatformEnvDataProvider } from '@wix/thunderbolt-symbols'
import { SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { ISessionManager, SessionManagerSiteConfig } from './types'
import { name, SessionManagerSymbol } from './symbols'

export const sessionEnvDataProvider = withDependencies(
	[SessionManagerSymbol, named(SiteFeatureConfigSymbol, name)],
	(sessionManager: ISessionManager, siteFeatureConfig: SessionManagerSiteConfig): PlatformEnvDataProvider => {
		return {
			platformEnvData() {
				return {
					session: {
						applicationsInstances: sessionManager.getAllInstances(),
						siteMemberId: sessionManager.getSiteMemberId(),
						visitorId: sessionManager.getVisitorId(),
						svSession: sessionManager.getUserSession(),
						smToken: sessionManager.getSmToken(),
						isRunningInDifferentSiteContext: siteFeatureConfig.isRunningInDifferentSiteContext,
						contactId: sessionManager.getContactId(),
					},
				}
			},
		}
	}
)
