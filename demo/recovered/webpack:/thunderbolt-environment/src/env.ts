import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import * as logger from './logger/logger'
import * as bi from './bi/bi'
import * as experimentsLoader from './experiments'
import * as viewerModel from './viewer-model/viewer-model'
import * as fetchApiLoader from './client-fetch/client-fetch'
import * as componentsLibrariesLoader from './componentsLoader/componentsLibrariesLoader'
import * as waitForDomReadyLoader from './dom-ready/waitForDomReadyLoader'
import * as featureStateLoader from 'thunderbolt-feature-state'
import * as featureExportsLoader from 'thunderbolt-feature-exports'
import type { Environment } from './types/Environment'
import {
	SiteAssetsClientSym,
	BrowserWindowSymbol,
	ReducedMotionSymbol,
	SsrLoggerSymbol,
	BaseComponentSymbol,
	PlatformWorkerPromiseSym,
	RendererExtensionsSymbol,
	MawSdkSymbol,
	AuthenticationSymbol,
	PerfReporterSymbol,
	MainGridAppIdFetchSymbol,
	TBReadySymbol,
	NotifyErrorSymbol,
	TBInstanceIdSymbol,
} from '@wix/thunderbolt-symbols'
import { WarmupDataPromiseSymbol } from 'feature-warmup-data'
import { prefersReducedMotion } from './lib/prefersReducedMotion'
import type { ILoadFeatures } from '@wix/thunderbolt-features'
import { FeaturesLoaderSymbol } from '@wix/thunderbolt-features'
import type { RendererPrepError } from '@wix/thunderbolt-commons'

// TODO tmp put this here until able to use the one defined in thunderbolt-site-assets-client
const siteAssetsClientLoader = {
	site:
		({ siteAssetsClient }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind(SiteAssetsClientSym).toConstantValue(siteAssetsClient)
		},
}

const browserWindowLoader = {
	site:
		({ browserWindow }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind(BrowserWindowSymbol).toConstantValue(browserWindow)
		},
}

const reducedMotionLoader = {
	site:
		({ browserWindow, viewerModel: { requestUrl } }: Environment): ContainerModuleLoader =>
		(bind) => {
			const reducedMotion = prefersReducedMotion(browserWindow, requestUrl)
			bind(ReducedMotionSymbol).toConstantValue(reducedMotion)
		},
}

const warmupDataLoader = {
	site:
		({ warmupData }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind(WarmupDataPromiseSymbol).toConstantValue(warmupData)
		},
}

const notifyErrorLoader = {
	site:
		({ callbacks }: Environment): ContainerModuleLoader =>
		(bind) => {
			if (callbacks && callbacks.onError) {
				bind(NotifyErrorSymbol).toConstantValue((error: RendererPrepError) => {
					callbacks.onError(error)
				})
			}
		},
}

const featuresLoadersLoader = {
	site:
		({ specificEnvFeaturesLoaders }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind<ILoadFeatures>(FeaturesLoaderSymbol).toConstantValue(specificEnvFeaturesLoaders)
		},
}

const contextualSsrLoggerLoader = {
	site:
		({ contextualSsrLogger }: Environment): ContainerModuleLoader =>
		(bind) => {
			const isSsr = !process.env.browser
			if (isSsr) {
				bind(SsrLoggerSymbol).toConstantValue(contextualSsrLogger)
			}
		},
}

const baseComponentLoader = {
	site:
		({ BaseComponent }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind(BaseComponentSymbol).toConstantValue(BaseComponent)
		},
}

const platformWorkerPromiseLoader = {
	site:
		({ platformWorkerPromise }: Environment): ContainerModuleLoader =>
		(bind) => {
			// TODO make all platform flows work with this loader
			if (platformWorkerPromise) {
				bind(PlatformWorkerPromiseSym).toConstantValue(platformWorkerPromise)
			}
		},
}

const extensionsLoader = {
	site:
		({ extensions }: Environment): ContainerModuleLoader =>
		(bind) => {
			if (extensions) {
				bind(RendererExtensionsSymbol).toConstantValue(extensions)
			}
		},
}

const mawSdkLoader = {
	site:
		({ extensions }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind(MawSdkSymbol).toConstantValue({
				invoke: (...args: []) => {
					if (extensions?.mawSdk?.invoke) {
						return extensions.mawSdk.invoke(...args)
					} else {
						const msg = 'mawSdk invoke is not supported'
						console.error(msg)
						Promise.reject(msg)
					}
				},
			})
		},
}

const authenticationLoader = {
	site:
		({ authentication }: Environment): ContainerModuleLoader =>
		(bind) => {
			if (authentication) {
				bind(AuthenticationSymbol).toConstantValue(authentication)
			}
		},
}

const perfReporterLoader = {
	site:
		({ perfReporter }: Environment): ContainerModuleLoader =>
		(bind) => {
			if (perfReporter) {
				bind(PerfReporterSymbol).toConstantValue(perfReporter)
			}
		},
}

const mainGridAppIdLoader = {
	site:
		({ mainGridAppId }: Environment): ContainerModuleLoader =>
		(bind) => {
			if (mainGridAppId) {
				bind(MainGridAppIdFetchSymbol).toConstantValue(mainGridAppId)
			}
		},
}

const tbReadyLoader = {
	site:
		({ tbReady }: Environment): ContainerModuleLoader =>
		(bind) => {
			const isSsr = !process.env.browser
			if (!isSsr) {
				bind(TBReadySymbol).toConstantValue(tbReady)
			}
		},
}

const tbInstanceIdLoader = {
	site:
		({ tbInstanceId }: Environment): ContainerModuleLoader =>
		(bind) => {
			bind(TBInstanceIdSymbol).toConstantValue(tbInstanceId || 0)
		},
}

const loaders = [
	tbInstanceIdLoader,
	logger,
	bi,
	experimentsLoader,
	viewerModel,
	fetchApiLoader,
	componentsLibrariesLoader,
	featuresLoadersLoader,
	featureStateLoader,
	siteAssetsClientLoader,
	browserWindowLoader,
	warmupDataLoader,
	reducedMotionLoader,
	featureExportsLoader,
	contextualSsrLoggerLoader,
	waitForDomReadyLoader,
	baseComponentLoader,
	platformWorkerPromiseLoader,
	extensionsLoader,
	mawSdkLoader,
	authenticationLoader,
	perfReporterLoader,
	mainGridAppIdLoader,
	tbReadyLoader,
	notifyErrorLoader,
]

export const createEnvLoader =
	(env: Environment): ContainerModuleLoader =>
	(bind) => {
		loaders.forEach((loaderCreator) => loaderCreator.site(env)(bind))
	}
