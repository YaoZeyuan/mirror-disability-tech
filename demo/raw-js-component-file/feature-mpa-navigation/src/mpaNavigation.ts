import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	BusinessLogger,
	Experiments,
	INavigationManager,
	ViewerModel,
} from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	BusinessLoggerSymbol,
	ExperimentsSymbol,
	MasterPageFeatureConfigSymbol,
	NavigationManagerSymbol,
	SiteFeatureConfigSymbol,
	ViewerModelSym,
} from '@wix/thunderbolt-symbols'
import { links, isSSR } from '@wix/thunderbolt-commons'
import type { ISessionManager } from 'feature-session-manager'
import { SessionManagerSymbol } from 'feature-session-manager'

import type {
	IAudioPlaybackState,
	IMpaNavigation,
	MpaNavigationMasterPageConfig,
	MpaNavigationSiteConfig,
} from './types'
import { AudioPlaybackStateSymbol, name } from './symbols'

export const MpaNavigation = withDependencies(
	[
		named(SiteFeatureConfigSymbol, name),
		named(MasterPageFeatureConfigSymbol, name),
		ViewerModelSym,
		ExperimentsSymbol,
		BrowserWindowSymbol,
		BusinessLoggerSymbol,
		SessionManagerSymbol,
		AudioPlaybackStateSymbol,
		NavigationManagerSymbol,
	],
	(
		siteConfig: MpaNavigationSiteConfig,
		masterPageConfig: MpaNavigationMasterPageConfig,
		viewerModel: ViewerModel,
		experiments: Experiments,
		browserWindow: BrowserWindow,
		businessLogger: BusinessLogger,
		sessionManager: ISessionManager,
		audioPlaybackState: IAudioPlaybackState,
		navigationManager: INavigationManager
	): IMpaNavigation => {
		const isLoggedIn = () => !!(sessionManager.getSiteMemberId() || sessionManager.getSmToken())

		return {
			isEligible: ({ anchorCompId, anchorDataId, skipHistory } = {}) => {
				if (siteConfig.forceMpaNavigation) {
					return true
				}

				// In SSR (no browserWindow), we assume view transitions are supported for MPA navigation eligibility
				// since SSR doesn't need to check browser capabilities - the client will handle transitions
				// This may mean there is a mismatch at runtime between the server and client isEligible() results
				const browserSupportsViewTransitions = browserWindow ? 'CSSViewTransitionRule' in browserWindow : false
				const supportsViewTransitions = isSSR(browserWindow) || browserSupportsViewTransitions

				const hasAudioEverPlayed = audioPlaybackState.hasEverPlayed()

				const exclusionReasons: Array<string> = [...(viewerModel.mpaExclusionReasons || [])]
				let isEligibleToMpaNavigation = !!viewerModel.mpaNavigationCompatible

				if (!viewerModel.mpaNavigationCompatible && !viewerModel.mpaExclusionReasons?.length) {
					exclusionReasons.push('mpaNavigationNotCompatible')
				}
				if (process.env.PACKAGE_NAME === 'thunderbolt-ds') {
					exclusionReasons.push('preview')
					isEligibleToMpaNavigation = false
				}
				if (masterPageConfig.hasPageTransition && !supportsViewTransitions) {
					exclusionReasons.push('pageTransitionsNoViewTransitions')
					isEligibleToMpaNavigation = false
				}
				if (isLoggedIn()) {
					exclusionReasons.push('userLoggedIn')
					isEligibleToMpaNavigation = false
				}
				if (siteConfig.isRunningInDifferentSiteContext) {
					exclusionReasons.push('differentSiteContext')
					isEligibleToMpaNavigation = false
				}
				if (anchorCompId || anchorDataId || skipHistory) {
					exclusionReasons.push('navigationProps')
					isEligibleToMpaNavigation = false
				}
				if (hasAudioEverPlayed) {
					exclusionReasons.push('audioPlayback')
					isEligibleToMpaNavigation = false
				}
				// Informational — logged for diagnostics but don't affect eligibility.
				// Only added when exclusion is due to potentially stale server data (mpaNavigationCompatible).
				if (!navigationManager.isFirstPage() && !viewerModel.mpaNavigationCompatible) {
					exclusionReasons.push('excludedByFirstPage')
				}
				if (!experiments['specs.thunderbolt.fullPageNavigationSpecificSites']) {
					exclusionReasons.push('experimentNotEnabled')
				}

				void businessLogger.logger.log(
					{
						src: 72,
						evid: 19,
						isEligible: isEligibleToMpaNavigation,
						...(viewerModel.mpaIncompatibleWidgetsList?.length && {
							mpaIncompatibleWidgetsList: viewerModel.mpaIncompatibleWidgetsList.join(','),
						}),
						...(exclusionReasons.length && {
							mpaExclusionReasons: exclusionReasons.join(','),
						}),
					},
					{ endpoint: 'bolt-performance' }
				)

				return !!experiments['specs.thunderbolt.fullPageNavigationSpecificSites'] && isEligibleToMpaNavigation
			},
			navigate: (href: string) => {
				if (!browserWindow) {
					return false
				}

				const currentUrl = new URL(browserWindow.location.href)
				const navigableUrl = new URL(href)
				navigableUrl.protocol = currentUrl.protocol
				navigableUrl.href = links.appendInternalQueryParamsToHref(navigableUrl.href, currentUrl)

				if (navigableUrl.href === currentUrl.href) {
					return true
				}

				browserWindow.sessionStorage.setItem('isMpa', 'true')
				browserWindow.location.href = navigableUrl.href

				return true
			},
		}
	}
)
