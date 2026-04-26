import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { SdkHandlersProvider } from '@wix/thunderbolt-symbols'
import { FeatureExportsSymbol, PageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { name, ReactionsStateApiSymbol } from '../symbols'
import type { EffectTriggersSdkHandlers, IReactionsStateApi, TriggersAndReactionsPageConfig } from '../types'
import { getFullId } from '@wix/thunderbolt-commons'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'

export const effectsTriggersSdkProvider = withDependencies(
	[ReactionsStateApiSymbol, named(PageFeatureConfigSymbol, name), named(FeatureExportsSymbol, name)],
	(
		reactionsStateAPI: IReactionsStateApi,
		pageConfig: TriggersAndReactionsPageConfig,
		triggersAndReactionsExports: IFeatureExportsStore<typeof name>
	): SdkHandlersProvider<EffectTriggersSdkHandlers> => {
		const getIdByCompIdAndName = (compId: string, effectName: string) => {
			const _compId = getFullId(compId)
			return pageConfig.compEffectsToVariantId[_compId]?.[effectName]
		}

		const toggleEffects = (compId: string, effects: Array<string>) => {
			effects.forEach((effect) => {
				reactionsStateAPI.toggleState(getIdByCompIdAndName(compId, effect), compId)
			})
		}

		const removeAllEffects = (compId: string) => {
			reactionsStateAPI.removeAllStates(compId)
		}

		const applyEffects = (compId: string, effects: Array<string>) => {
			effects.forEach((effect) => {
				reactionsStateAPI.addState(getIdByCompIdAndName(compId, effect), compId)
			})
		}

		const removeEffects = (compId: string, effects: Array<string>) => {
			effects.forEach((effect) => {
				reactionsStateAPI.removeState(getIdByCompIdAndName(compId, effect), compId)
			})
		}

		const registerToActiveEffectsChange = (callback: (componentId: string, effects: Array<string>) => void): void => {
			reactionsStateAPI.registerToActiveEffectsChange((compId: string, variantIds: Array<string>) =>
				callback(
					compId,
					variantIds.map((variantId) => pageConfig.variantIdToEffect[variantId])
				)
			)
		}

		triggersAndReactionsExports.export({
			applyEffects,
			removeEffects,
		})

		return {
			getSdkHandlers: () => ({
				[name]: {
					toggleEffects,
					removeAllEffects,
					applyEffects,
					removeEffects,
					registerToActiveEffectsChange,
				},
			}),
		}
	}
)
