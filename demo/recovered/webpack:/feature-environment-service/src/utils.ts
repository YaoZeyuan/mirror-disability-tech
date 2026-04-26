import type { ViewMode, ViewerModel } from '@wix/thunderbolt-symbols'
import type { EnvironmentServiceEditorConfig, EnvironmentServiceSiteConfig } from './types'
import type { IEnvironmentServiceConfig } from '@wix/viewer-service-environment/definition'

export const getServiceConfig = (
	featureConfig: EnvironmentServiceSiteConfig | EnvironmentServiceEditorConfig,
	viewerModel: ViewerModel,
	siteLanguage: string,
	viewMode: ViewMode
): IEnvironmentServiceConfig => {
	return {
		...featureConfig,
		editorType: featureConfig.editorType as IEnvironmentServiceConfig['editorType'],
		requestUrl: viewerModel?.requestUrl,
		isQaMode: viewerModel?.mode.qa,
		viewMode,
		editorName: viewerModel?.site.editorName,
		deviceType: viewerModel?.deviceInfo.deviceClass,
		language: siteLanguage as IEnvironmentServiceConfig['language'],
	}
}
