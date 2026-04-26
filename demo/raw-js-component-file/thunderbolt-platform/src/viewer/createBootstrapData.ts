import _ from 'lodash'
import type { Experiments, PlatformBootstrapData, PlatformEnvData, ServiceProvider } from '@wix/thunderbolt-symbols'
import type { BootstrapData } from '../types'
import { getServiceConfigs } from '../utils/servicesUtils'

export function createBootstrapData({
	platformBootstrapData,
	siteFeaturesConfigs,
	currentContextId,
	currentPageId,
	platformEnvData,
	experiments,
	registeredServices,
	isBuilderComponentModel,
}: {
	platformBootstrapData: PlatformBootstrapData
	siteFeaturesConfigs: BootstrapData['sdkFactoriesSiteFeatureConfigs']
	currentContextId: string
	currentPageId: string
	platformEnvData: PlatformEnvData
	experiments: Experiments
	registeredServices?: Array<ServiceProvider>
	isBuilderComponentModel: boolean
}): BootstrapData {
	return {
		currentPageId,
		currentContextId,
		platformEnvData,
		sdkFactoriesSiteFeatureConfigs: _.pickBy(siteFeaturesConfigs, (__, featureName) =>
			featureName.toLowerCase().includes('wixcodesdk')
		),
		...platformBootstrapData,
		...(platformEnvData.builderComponentsImportMapSdkUrls && {
			builderComponentsImportMapSdkUrls: platformEnvData.builderComponentsImportMapSdkUrls,
		}),
		...(platformEnvData.builderComponentsCompTypeSdkUrls && {
			builderComponentsCompTypeSdkUrls: platformEnvData.builderComponentsCompTypeSdkUrls,
		}),
		experiments,
		...(registeredServices && {
			serviceDefinitionToConfig: getServiceConfigs(registeredServices),
		}),
		isBuilderComponentModel,
	}
}
