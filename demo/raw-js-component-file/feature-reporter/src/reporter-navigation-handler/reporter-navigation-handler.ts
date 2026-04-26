import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageDidMountHandler, IReporterOptions } from '@wix/thunderbolt-symbols'
import {
	FeatureStateSymbol,
	MasterPageFeatureConfigSymbol,
	pageIdSym,
	SiteFeatureConfigSymbol,
	ExperimentsSymbol,
	ConsentPolicySymbol,
} from '@wix/thunderbolt-symbols'
import type { IUrlHistoryManager, IPageNumber } from 'feature-router'
import { UrlHistoryManagerSymbol, PageNumberSymbol } from 'feature-router'
import type { IReporterApi, ReporterMasterPageConfig, ReporterSiteConfig, ReporterState } from '../types'
import { ReporterSymbol, name } from '../symbols'
import { reportPageView } from '../report-page-view'
import type { ISeoSiteApi } from 'feature-seo'
import { SeoSiteSymbol } from 'feature-seo'
import type { IConsentPolicy } from 'feature-consent-policy'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { isUserConsentProvided, setState } from '../utils'

const reporterNavigationHandlerFactory = (
	reporterApi: IReporterApi,
	featureState: IFeatureState<ReporterState>,
	masterPageConfig: ReporterMasterPageConfig,
	siteConfig: ReporterSiteConfig,
	urlHistoryManager: IUrlHistoryManager,
	consentPolicy: IConsentPolicy,
	pageNumberApi: IPageNumber,
	seoApi: ISeoSiteApi,
	pageId: string
): IPageDidMountHandler => ({
	pageDidMount: async () => {
		if (pageId === 'masterPage') {
			return
		}
		const pageNumber = pageNumberApi.getPageNumber()
		const pageViewPayload = {
			masterPageConfig,
			siteConfig,
			reporterApi,
			parsedUrl: urlHistoryManager.getParsedUrl(),
			pageNumber,
			pageId,
			pageTitle: pageNumber > 1 ? await seoApi.getPageTitle() : window.document.title,
		}

		// always report to listeners and essential channels
		sendPageView({ reportToListenersOnly: true })
		sendPageView({ reportToEssentialsOnly: true })

		// report to channels once consent is provided
		if (isUserConsentProvided(consentPolicy)) {
			if (featureState.get().tagManagerReady) {
				sendPageView({ reportToChannelsOnly: true })
			} else {
				setState(featureState, { sendDeferredPageView })
			}
		} else {
			window!.document.addEventListener('consentPolicyChanged', onConsentPolicyChanged, { once: true })
		}

		function onConsentPolicyChanged() {
			const { policy } = consentPolicy.getCurrentConsentPolicy()
			if (policy?.analytics || policy?.advertising) {
				setState(featureState, { sendDeferredPageView })
			}
		}

		function sendDeferredPageView() {
			sendPageView({ reportToChannelsOnly: true })
		}

		function sendPageView(reporterOptions: IReporterOptions) {
			reportPageView({ ...pageViewPayload, reporterOptions })
		}
	},
})

export const ReporterNavigationHandler = withDependencies(
	[
		ReporterSymbol,
		named(FeatureStateSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		named(SiteFeatureConfigSymbol, name),
		UrlHistoryManagerSymbol,
		ConsentPolicySymbol,
		PageNumberSymbol,
		SeoSiteSymbol,
		pageIdSym,
		ExperimentsSymbol,
	],
	reporterNavigationHandlerFactory
)
