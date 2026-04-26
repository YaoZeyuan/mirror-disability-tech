import type { ViewerModel } from '@wix/thunderbolt-symbols'

export const isLazyLoadCompatible = (viewerModel: ViewerModel) =>
	viewerModel.react18Compatible &&
	(viewerModel.experiments['specs.thunderbolt.lazy_load_iframe'] || !isIFrame()) &&
	process.env.PACKAGE_NAME !== 'thunderbolt-ds' &&
	process.env.RENDERER_BUILD !== 'react-native'

export const isIFrame = (): boolean => {
	try {
		return window.self !== window.top
	} catch {
		// empty
	}
	return false
}
