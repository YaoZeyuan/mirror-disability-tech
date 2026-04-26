import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ISeoSiteApi } from 'feature-seo'
import { SeoSiteSymbol } from 'feature-seo'
import type { PlatformEnvDataProvider } from '@wix/thunderbolt-symbols'

export const seoPlatformEnvDataProvider = withDependencies(
	[SeoSiteSymbol],
	(seoApi: ISeoSiteApi): PlatformEnvDataProvider => {
		const siteLevelSeoData = seoApi.getSiteLevelSeoData()
		return {
			platformEnvData() {
				return {
					seo: {
						...siteLevelSeoData,
					},
				}
			},
		}
	}
)
