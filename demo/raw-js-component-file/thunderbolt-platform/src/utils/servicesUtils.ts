import type { ServiceProvider } from '@wix/thunderbolt-symbols'
import { noopServiceDefinitions } from '../services/serviceLoaders'

export const removeDuplicatesServices = (services: Array<ServiceProvider>): Array<ServiceProvider> => {
	return [...new Map(services.map((item: ServiceProvider) => [item.definition, item])).values()]
}

export const getServiceConfigs = (registeredServices: Array<ServiceProvider>): Record<string, any> => {
	const serviceConfigs = registeredServices.reduce((acc: Record<string, any>, service: ServiceProvider) => {
		if (service.hasNonSerializablePlatformConfig || service.platformConfig) {
			acc[service.definition] = service.hasNonSerializablePlatformConfig ? {} : service.platformConfig
		}
		return acc
	}, {})

	// Include all noop services on the platform with empty configs - remove once the noops services are implemented
	noopServiceDefinitions.forEach((noopServiceDefinition) => {
		if (!serviceConfigs[noopServiceDefinition]) {
			serviceConfigs[noopServiceDefinition] = {}
		}
	})

	return serviceConfigs
}
