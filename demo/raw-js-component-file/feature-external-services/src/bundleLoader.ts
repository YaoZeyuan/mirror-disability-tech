import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type { ILogger, ISessionManager, ModuleLoader } from '@wix/thunderbolt-symbols'
import { LoggerSymbol } from '@wix/thunderbolt-symbols'
import { ESMLoaderSymbol } from 'feature-builder-module-loader'
import { SessionManagerSymbol } from 'feature-session-manager'
import type { ExternalServiceBundle } from './types'
import type { ServiceDefinition } from '@wix/services-manager/types'
import { SSRServicesModuleLoaderSymbol } from './symbols'

const loadServiceBundle = async (
	bundleUrl: string,
	packageName: string,
	logger: ILogger,
	moduleLoader: ModuleLoader,
	accessTokenGetter: () => Promise<string>
): Promise<ExternalServiceBundle | null> => {
	try {
		logger.interactionStarted('load_external_service_bundle', {
			paramsOverrides: { packageName, bundleUrl },
		})

		const moduleEntries = await moduleLoader.loadModule<any>(bundleUrl)

		if (typeof moduleEntries.injectAccessTokenGetter === 'function') {
			moduleEntries.injectAccessTokenGetter(accessTokenGetter)
		}

		let impl: any = null

		if (moduleEntries.impl) {
			impl = moduleEntries.impl
		} else if (moduleEntries.implementation) {
			impl = moduleEntries.implementation
		} else if (moduleEntries.default) {
			impl = moduleEntries.default
		} else {
			// Check if there's a named export containing impl
			const exportKeys = Object.keys(moduleEntries)
			for (const key of exportKeys) {
				const exportValue = moduleEntries[key]
				if (exportValue && typeof exportValue === 'function') {
					// Assume the first function export is the impl
					impl = exportValue
					break
				}
			}
		}

		if (!impl) {
			logger.captureError(new Error(`External service bundle missing implementation export: ${packageName}`), {
				tags: {
					feature: 'externalServices',
					packageName,
				},
				extra: {
					bundleUrl,
					exportKeys: Object.keys(moduleEntries),
				},
			})
			return null
		}

		logger.interactionEnded('load_external_service_bundle', {
			paramsOverrides: { packageName },
		})

		return {
			definition: packageName as ServiceDefinition<any, any>,
			impl,
		}
	} catch (error) {
		logger.captureError(error as Error, {
			tags: {
				feature: 'externalServices',
				packageName,
			},
			extra: {
				bundleUrl,
				errorMessage: (error as Error).message,
			},
		})
		return null
	}
}

export interface IServiceBundleLoader {
	loadServiceBundleWithCache(
		bundleUrl: string,
		packageName: string,
		appDefinitionId: string
	): Promise<ExternalServiceBundle | null>
	clearBundleCache(): void
}

export const ServiceBundleLoader = withDependencies(
	[LoggerSymbol, ESMLoaderSymbol, optional(SSRServicesModuleLoaderSymbol), SessionManagerSymbol],
	(
		logger: ILogger,
		csrServiceModuleLoader: ModuleLoader,
		ssrServicesModuleLoader: ModuleLoader | undefined,
		sessionManager: ISessionManager
	): IServiceBundleLoader => {
		const bundleCache = new Map<string, Promise<ExternalServiceBundle | null>>()

		const moduleLoaderToUse = ssrServicesModuleLoader ?? csrServiceModuleLoader

		return {
			loadServiceBundleWithCache: (bundleUrl, packageName, appDefinitionId) => {
				const cacheKey = `${packageName}:${bundleUrl}`

				if (bundleCache.has(cacheKey)) {
					return bundleCache.get(cacheKey)!
				}

				const accessTokenGetter = sessionManager.getBoundAccessTokenFunction(appDefinitionId)

				const promise = loadServiceBundle(bundleUrl, packageName, logger, moduleLoaderToUse, accessTokenGetter)
				bundleCache.set(cacheKey, promise)

				return promise
			},

			clearBundleCache: () => {
				bundleCache.clear()
			},
		}
	}
)
