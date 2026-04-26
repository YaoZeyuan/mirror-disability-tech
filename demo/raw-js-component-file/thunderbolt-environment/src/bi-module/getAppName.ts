import type { ViewerModel } from '@wix/thunderbolt-symbols'

export function getAppName(viewerModel: ViewerModel, appNameOverride?: string): string {
	return viewerModel.requestUrl!.toLowerCase().includes('rc=mobile_app_builder')
		? appNameOverride
			? appNameOverride
			: 'thunderbolt-renderer-mobile'
		: viewerModel.site.appNameForBiEvents
}
