import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import {
	CurrentRouteInfoSymbol,
	FeatureStateSymbol,
	pageIdSym,
	PlatformWorkerPromiseSym,
	ViewerModelSym,
} from '@wix/thunderbolt-symbols'
import type {
	ICurrentRouteInfo,
	TpaHandlerProvider,
	IPageWillUnmountHandler,
	PlatformWorkerPromise,
	PublicAPI,
	SdkHandlersProvider,
	ViewerModel,
} from '@wix/thunderbolt-symbols'
import { name } from './symbols'
import type { IFeatureState } from 'thunderbolt-feature-state'
import { createPromise, loadPmRpc } from '@wix/thunderbolt-commons'
import type { AppsPublicApisGetter, PublicApiTpaSdkHandlers } from './types'

type TpaState = {
	[pageId: string]: {
		publicApiTPAHandlerState: null | {
			wixCodeWorkerReadyPromise?: Promise<{}>
			resolvePublicApiGetter: (appsPublicApisGetter: AppsPublicApisGetter) => void
			waitForAppsToRegister: Promise<AppsPublicApisGetter>
		}
	}
}

/**
 * Retrieves a platform app's public API if there's at least one (any) platform controller on page
 * Returns null otherwise
 */
export const PublicApiTPAHandler = withDependencies(
	[
		named(FeatureStateSymbol, name),
		optional(PlatformWorkerPromiseSym),
		ViewerModelSym,
		pageIdSym,
		CurrentRouteInfoSymbol,
	],
	(
		featureState: IFeatureState<TpaState>,
		platformWorkerPromiseObj: {
			platformWorkerPromise: PlatformWorkerPromise
		},
		{ siteAssets, mode: { debug } }: ViewerModel,
		pageId: string,
		currentRouteInfo: ICurrentRouteInfo
	): TpaHandlerProvider & SdkHandlersProvider<PublicApiTpaSdkHandlers> & IPageWillUnmountHandler => {
		const { promise: waitForAppsToRegister, resolver: resolvePublicApiGetter } = createPromise<AppsPublicApisGetter>()

		const isMasterPage = pageId === 'masterPage'
		if (!isMasterPage) {
			featureState.update(() => ({
				...featureState.get(),
				[pageId]: {
					publicApiTPAHandlerState: {
						resolvePublicApiGetter,
						waitForAppsToRegister,
					},
				},
			}))
		}

		const getCurrPageId = () => (isMasterPage ? (currentRouteInfo.getCurrentRouteInfo()?.pageId ?? pageId) : pageId)

		const waitForWixCodeWorkerToBeReady = async () => {
			if (debug) {
				console.warn(
					'getPublicApi() has high performance overhead as we download and execute all apps on site. consider mitigating this by e.g migrating to Wix Blocks or OOI.'
				)
			}

			const currPageId = getCurrPageId()

			const [pmRpc, worker, getPublicApiNames] = await Promise.all([
				loadPmRpc(siteAssets.clientTopology.moduleRepoUrl),
				platformWorkerPromiseObj.platformWorkerPromise as Promise<Worker>,
				featureState.get()[currPageId].publicApiTPAHandlerState!.waitForAppsToRegister,
			])

			const appsPublicApisNames = await getPublicApiNames()

			if (!appsPublicApisNames.length) {
				const errorMessage = 'getPublicApi() rejected since there are no platform apps on page'
				if (debug) {
					console.warn(errorMessage)
				}
				throw new Error(errorMessage)
			}

			await Promise.all(
				appsPublicApisNames.map((appName: string) =>
					pmRpc.api.request(appName, { target: worker }).then((publicAPI: PublicAPI) => {
						pmRpc.api.set(appName, publicAPI)
					})
				)
			)

			return {}
		}
		return {
			pageWillUnmount() {
				featureState.update(() => ({
					...featureState.get(),
					[pageId]: {
						publicApiTPAHandlerState: null,
					},
				}))
			},
			getTpaHandlers() {
				return {
					waitForWixCodeWorkerToBeReady: () => {
						const currPageId = getCurrPageId()
						const publicApiTPAHandlerState = featureState.get()[currPageId].publicApiTPAHandlerState!

						if (publicApiTPAHandlerState.wixCodeWorkerReadyPromise) {
							return publicApiTPAHandlerState.wixCodeWorkerReadyPromise
						}

						const wixCodeWorkerReadyPromise = waitForWixCodeWorkerToBeReady()
						featureState.update(() => ({
							...featureState.get(),
							[currPageId]: {
								publicApiTPAHandlerState: { ...publicApiTPAHandlerState, wixCodeWorkerReadyPromise },
							},
						}))

						return wixCodeWorkerReadyPromise
					},
				}
			},
			getSdkHandlers: () => ({
				publicApiTpa: {
					registerPublicApiGetter: (appsPublicApisGetter: AppsPublicApisGetter) => {
						const state = featureState.get()
						if (
							!state ||
							!state[pageId] ||
							!state[pageId].publicApiTPAHandlerState ||
							!state[pageId].publicApiTPAHandlerState?.resolvePublicApiGetter
						) {
							return
						}
						state[pageId].publicApiTPAHandlerState?.resolvePublicApiGetter(appsPublicApisGetter)
					},
				},
			}),
		}
	}
)
