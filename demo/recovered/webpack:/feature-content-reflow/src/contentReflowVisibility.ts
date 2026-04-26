import { REFLOW_BANNER_COMP_ID } from './symbols'
import type { BusinessLogger, IStructureAPI } from '@wix/thunderbolt-symbols'
import { BusinessLoggerSymbol, StructureAPI } from '@wix/thunderbolt-symbols'
import { withDependencies } from '@wix/thunderbolt-ioc'

export const contentReflowBannerVisibilityFactory = (structureApi: IStructureAPI, businessLogger: BusinessLogger) => {
	let isFirstTimeBannerExposure = true

	return {
		showContentReflowBanner: () => {
			const isContentReflowBannerVisible = structureApi.isComponentInDynamicStructure(REFLOW_BANNER_COMP_ID)

			if (!isContentReflowBannerVisible) {
				structureApi.addComponentToDynamicStructure(REFLOW_BANNER_COMP_ID, {
					componentType: 'ContentReflowBanner',
					components: [],
				})
			}
			if (isFirstTimeBannerExposure) {
				businessLogger.logger.log(
					{
						src: 29,
						evid: 8,
					},
					{ endpoint: 'm' }
				)
				isFirstTimeBannerExposure = false
			}
		},

		hideContentReflowBanner: () => {
			structureApi.removeComponentFromDynamicStructure(REFLOW_BANNER_COMP_ID)
		},
	}
}

export const ContentReflowBannerVisibility = withDependencies(
	[StructureAPI, BusinessLoggerSymbol],
	contentReflowBannerVisibilityFactory
)
