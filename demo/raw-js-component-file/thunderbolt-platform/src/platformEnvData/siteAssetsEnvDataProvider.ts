import { withDependencies } from '@wix/thunderbolt-ioc'
import type { Experiments, PlatformEnvDataProvider, ViewerModel } from '@wix/thunderbolt-symbols'
import { ExperimentsSymbol, SiteAssetsClientSym, ViewerModelSym } from '@wix/thunderbolt-symbols'
import type { SiteAssetsClientAdapter } from 'thunderbolt-site-assets-client'

export const siteAssetsEnvDataProvider = withDependencies(
	[ExperimentsSymbol, SiteAssetsClientSym, ViewerModelSym],
	(
		experiments: Experiments,
		siteAssetsClient: SiteAssetsClientAdapter,
		viewerModel: ViewerModel
	): PlatformEnvDataProvider => {
		const {
			siteAssets,
			deviceInfo,
			mode: { siteAssetsFallback },
		} = viewerModel
		const clientInitParams = {
			deviceInfo,
			siteAssetsClientConfig: siteAssetsClient.getInitConfig(),
			fallbackStrategy: siteAssetsFallback,
		}

		return {
			platformEnvData() {
				return {
					siteAssets: {
						...siteAssets,
						clientInitParams,
					},
				}
			},
		}
	}
)
