import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IComponentsRegistrar } from '@wix/thunderbolt-components-loader'

export const ContentReflowBannerRegistrar = withDependencies([], (): IComponentsRegistrar => {
	return {
		getComponents() {
			return {
				ContentReflowBanner: () =>
					import('./viewer/ContentReflowBanner' /* webpackChunkName: "ContentReflowBanner" */).then(
						(componentModule) => {
							return {
								component: componentModule.default,
							}
						}
					),
			}
		},
	}
})
