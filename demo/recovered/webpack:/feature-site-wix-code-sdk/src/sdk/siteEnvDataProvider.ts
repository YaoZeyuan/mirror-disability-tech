import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	PlatformEnvDataProvider,
	SiteWixCodeSdkSiteConfig,
	Experiments,
	ViewerModel,
	BrowserWindow,
} from '@wix/thunderbolt-symbols'
import {
	SiteFeatureConfigSymbol,
	ExperimentsSymbol,
	ViewerModelSym,
	BrowserWindowSymbol,
} from '@wix/thunderbolt-symbols'
import { name } from '../symbols'

export const siteEnvDataProvider = withDependencies(
	[ExperimentsSymbol, named(SiteFeatureConfigSymbol, name), ViewerModelSym, BrowserWindowSymbol],
	(
		experiments: Experiments,
		siteWixCodeSdkSiteConfig: SiteWixCodeSdkSiteConfig,
		viewerModel: ViewerModel,
		window: BrowserWindow
	): PlatformEnvDataProvider => {
		const {
			mode,
			site: { isResponsive, siteId },
			pilerExperiments,
		} = viewerModel

		return {
			platformEnvData() {
				const { pageIdToTitle, viewMode, fontFaceServerUrl } = siteWixCodeSdkSiteConfig || {}
				return {
					site: {
						fontFaceServerUrl,
						experiments,
						pilerExperiments,
						isResponsive,
						siteId,
						pageIdToTitle,
						mode,
						viewMode,
						windowName: window?.name,
					},
				}
			},
		}
	}
)
