import { withDependencies } from '@wix/thunderbolt-ioc'
import type { SdkHandlersProvider, IHeadContent } from '@wix/thunderbolt-symbols'
import { HeadContentSymbol } from '@wix/thunderbolt-symbols'
// import { DynamicPagesAPI } from 'feature-router'
import type { EnvironmentWixCodeSdkHandlers } from '../types'

export const environmentSdkProvider = withDependencies(
	[HeadContentSymbol],
	(headContent: IHeadContent): SdkHandlersProvider<EnvironmentWixCodeSdkHandlers> => ({
		getSdkHandlers: () => ({
			addScriptToPreloadList: (url: string) => {
				headContent.addScriptToPreloadList(url)
			},
		}),
	})
)
