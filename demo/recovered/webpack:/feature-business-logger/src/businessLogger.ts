import { named, withDependencies, optional } from '@wix/thunderbolt-ioc'
import type { WixBiSession, IFetchApi, Experiments } from '@wix/thunderbolt-symbols'
import {
	WixBiSessionSymbol,
	Fetch,
	ExperimentsSymbol,
	FeatureExportsSymbol,
	METASITE_APP_DEF_ID,
	SiteServicesManagerSymbol,
	SiteFeatureConfigSymbol,
} from '@wix/thunderbolt-symbols'
import { commonBiLoggerFactory } from '@wix/thunderbolt-commons'
import type { ISessionManager } from 'feature-session-manager'
import { SessionManagerSymbol } from 'feature-session-manager'
import { BsiManagerSymbol, name } from './symbols'
import type { IBsiManager, BusinessLogger, BusinessLoggerSiteConfig } from './types'
import { factory } from '@wix/fe-essentials-viewer-platform/bi'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import type { ServicesManager } from '@wix/services-manager/types'
import { BusinessLoggerDefinition } from '@wix/viewer-service-business-logger/definition'

declare global {
	interface Window {
		thunderboltVersion: string
	}
}

/**
 * BI logger for business events
 *
 * - Initialized with base defaults + bsi (which are supported globally in the BI schema).
 * - Any additional defaults should be added only after making sure the BI schema supports them.
 *
 * Usage: businessLogger.logger.log({src: <SRC>, evid: <EVID>, ...<PARAMS>}, {endpoint: <PROJECT ENDPOINT>})
 *
 * Please use #bi-logger-support for any questions
 */
const defaultDependencies = [
	WixBiSessionSymbol,
	SessionManagerSymbol,
	Fetch,
	ExperimentsSymbol,
	named(FeatureExportsSymbol, name),
	named(SiteFeatureConfigSymbol, name),
]
export const BusinessLoggerFactory = withDependencies(
	process.env.browser
		? [...defaultDependencies, BsiManagerSymbol, optional(SiteServicesManagerSymbol)]
		: [...defaultDependencies, optional(SiteServicesManagerSymbol)],
	(
		wixBiSession: WixBiSession,
		sessionManager: ISessionManager,
		fetchApi: IFetchApi,
		experiments: Experiments,
		businessLoggerExports: IFeatureExportsStore<typeof name>,
		siteConfig: BusinessLoggerSiteConfig,
		bsiManager: IBsiManager,
		servicesManager?: ServicesManager
	): BusinessLogger => {
		const isBuilder = siteConfig.isBuilderComponentModel
		const isServicesInfra = experiments['specs.thunderbolt.servicesInfra'] || isBuilder
		if (isServicesInfra) {
			if (servicesManager?.hasService(BusinessLoggerDefinition)) {
				const businessLoggerService = servicesManager?.getService(BusinessLoggerDefinition)
				businessLoggerExports.export({
					reportBi: businessLoggerService?.reportBi,
				})

				return {
					logger: businessLoggerService!.logger,
					reportBi: businessLoggerService!.reportBi,
				}
			}
		}

		const { initialTimestamp, initialRequestTimestamp, dc, viewerSessionId, is_rollout, isCached, msId, isjp, btype } =
			wixBiSession

		const biStore = {
			msid: msId,
			viewerSessionId,
			initialTimestamp,
			initialRequestTimestamp,
			dc,
			is_rollout,
			isCached,
			is_headless: isjp,
			is_headless_reason: btype,
			viewerVersion: process.env.browser ? window.thunderboltVersion : process.env.APP_VERSION!,
			rolloutData: {
				siteAssetsVersionsRollout: false,
				isDACRollout: false,
				isTBRollout: false,
			},
			pageData: {
				pageNumber: 1,
				pageId: '0',
				pageUrl: '0',
				isLightbox: false,
			},
		}

		const biLoggerFactory = commonBiLoggerFactory.createBaseBiLoggerFactory({
			biStore,
			sessionManager,
			useBatch: false,
			fetch: fetchApi.envFetch,
			factory,
		})

		sessionManager.addLoadNewSessionCallback(({ results }) => {
			biLoggerFactory.updateDefaults({
				_mt_instance: results.instances[METASITE_APP_DEF_ID],
			})
		})

		if (process.env.browser) {
			biLoggerFactory.withNonEssentialContext({
				bsi: () => bsiManager.getBsi(),
			})
		}

		const logger = biLoggerFactory.logger()

		// @ts-expect-error https://github.com/wix-private/thunderbolt/pull/24467#discussion_r930920604
		const reportBi = (params, ctx) => logger.log(params, ctx)

		businessLoggerExports.export({
			reportBi,
		})

		return {
			logger,
			reportBi,
		}
	}
)
