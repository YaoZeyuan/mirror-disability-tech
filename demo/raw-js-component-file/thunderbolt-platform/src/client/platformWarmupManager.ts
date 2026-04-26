import { withDependencies } from '@wix/thunderbolt-ioc'
import type {
	Experiments,
	IAppWillRenderFirstPageHandler,
	IComponentsStylesOverrides,
	IPropsStore,
	IStructureStore,
} from '@wix/thunderbolt-symbols'
import {
	AppDidMountPromiseSymbol,
	ComponentsStylesOverridesSymbol,
	ExperimentsSymbol,
	Props,
	Structure,
} from '@wix/thunderbolt-symbols'
import type { IWarmupDataProvider } from 'feature-warmup-data'
import { WarmupDataProviderSymbol } from 'feature-warmup-data'
import _ from 'lodash'
import type { PartialUpdates, PlatformWarmupData, PlatformWarmupDataManagerAPI } from '../types'
import { yieldToMain } from '@wix/thunderbolt-commons'

export const PlatformWarmupDataManager = withDependencies(
	[
		WarmupDataProviderSymbol,
		AppDidMountPromiseSymbol,
		Props,
		Structure,
		ComponentsStylesOverridesSymbol,
		ExperimentsSymbol,
	],
	(
		warmupDataProvider: IWarmupDataProvider,
		appDidMountPromise: Promise<unknown>,
		propsStore: IPropsStore,
		structureStore: IStructureStore,
		componentsStylesOverrides: IComponentsStylesOverrides,
		experiments: Experiments
	): PlatformWarmupDataManagerAPI & IAppWillRenderFirstPageHandler => {
		const props: PartialUpdates = {}
		const structure: PartialUpdates = {}
		const styles: PartialUpdates = {}
		let appDidMount = false
		const isDynamicHydrationEnabled = experiments['specs.thunderbolt.viewport_hydration_extended_react_18']

		// When the application mounts, update the stores with the latest props, structure and styles
		appDidMountPromise
			.then(async () => {
				if (isDynamicHydrationEnabled) {
					await yieldToMain()
					componentsStylesOverrides.set(
						_.pickBy(styles, (compUpdates, id) => !_.isEqual(compUpdates, componentsStylesOverrides.getCompStyle(id)))
					)
					appDidMount = true
					return
				}
				await yieldToMain()
				// Update with the props that are not already in the store
				propsStore.update(_.pickBy(props, (compUpdates, id) => !_.isEqual(compUpdates, propsStore.get(id))))
				await yieldToMain()
				structureStore.update(_.pickBy(structure, (compUpdates, id) => !_.isEqual(compUpdates, structureStore.get(id))))
				componentsStylesOverrides.set(
					_.pickBy(styles, (compUpdates, id) => !_.isEqual(compUpdates, componentsStylesOverrides.getCompStyle(id)))
				)
				appDidMount = true
			})
			.catch((e) => {
				throw new Error(`appDidMount promise failed with error - ${e}`)
			})

		const warmupData = warmupDataProvider.getWarmupData<PlatformWarmupData>('platform').then((platformWarmupData) => {
			if (!platformWarmupData) {
				return
			}

			return {
				props: _.merge({}, ...platformWarmupData.ssrPropsUpdates),
				structure: _.merge({}, ...platformWarmupData.ssrStructureUpdates),
				styles: _.merge({}, ...platformWarmupData.ssrStyleUpdates),
			}
		})

		const shouldUseManager = async () => Boolean((await warmupData) && !appDidMount)

		return {
			shouldUseManager,
			// When repeater items receive props, we need to know whether to wait for the full compId to render.
			// wait for fullId when - the application is mounted & there is no warmup data for the compId,
			// meaning either there won't be any conflics between SSR and CSR or the item was dynamically added and so wasn't rendered on the server.
			// otherwise we'll wait for the compId to avoid diverges that may happen in case there was a prop update to a specific item after the application mounted.
			shouldWaitToRenderWithFullCompId: async (compId: string) =>
				!(await shouldUseManager()) && !(await warmupData)?.props[compId],
			async updateProps(partialUpdate: PartialUpdates) {
				_.forEach(partialUpdate, (compProps, compId) => {
					props[compId] = { ...props[compId], ...compProps }
				})
			},
			async updateStructure(partialUpdate: PartialUpdates) {
				_.forEach(partialUpdate, (compStructure, compId) => {
					structure[compId] = { ...structure[compId], ...compStructure }
				})
			},
			async updateStyles(partialUpdate: PartialUpdates) {
				_.forEach(partialUpdate, (compStyles, compId) => {
					styles[compId] = { ...styles[compId], ...compStyles }
				})
			},
			async appWillRenderFirstPage() {
				// update stores with warmup data before hydrating
				const platformWarmupData = await warmupData
				if (platformWarmupData) {
					propsStore.update(platformWarmupData.props)
					structureStore.update(platformWarmupData.structure)
					componentsStylesOverrides.set(platformWarmupData.styles)
				}
			},
		}
	}
)
