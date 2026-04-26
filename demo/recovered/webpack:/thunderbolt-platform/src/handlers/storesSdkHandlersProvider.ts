import { PlatformInitializerSym } from '../symbols'
import type { PlatformInitializer, PlatformResetComps } from '../types'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type {
	IComponentsStylesOverrides,
	PropsMap,
	SdkHandlersProvider,
	IPropsStore,
	StoresSdkHandlers,
	IStructureStore,
} from '@wix/thunderbolt-symbols'
import { ComponentsStylesOverridesSymbol, PlatformResetCompsSymbol, Props, Structure } from '@wix/thunderbolt-symbols'
import _ from 'lodash'

const getStyles = (
	overrideStyles: { [compId: string]: object },
	componentsStylesOverrides: IComponentsStylesOverrides
) =>
	_(overrideStyles)
		.mapValues((compStyles, compId) => ({ ...componentsStylesOverrides.getCompStyle(compId), ...compStyles }))
		.value()

export const storesSdkHandlersProvider = withDependencies(
	[PlatformInitializerSym, ComponentsStylesOverridesSymbol],
	(
		platformRunnerContext: PlatformInitializer,
		componentsStylesOverrides: IComponentsStylesOverrides
	): SdkHandlersProvider<StoresSdkHandlers> & StoresSdkHandlers => {
		const stores = {
			updateProps: (partialProps: PropsMap) => {
				void platformRunnerContext.updateProps(partialProps)
			},
			updateStyles: (overrideStyles: { [compId: string]: object }) => {
				const styles = getStyles(overrideStyles, componentsStylesOverrides)
				void platformRunnerContext.updateStyles(styles)
			},
			updateStructure: (partialStructure: { [compId: string]: object }) => {
				void platformRunnerContext.updateStructure(partialStructure)
			},
		}
		return {
			stores,
			getSdkHandlers: () => ({
				stores,
			}),
		}
	}
)

export const dsStoresSdkHandlersProvider = withDependencies(
	[ComponentsStylesOverridesSymbol, PlatformResetCompsSymbol, Props, Structure],
	(
		componentsStylesOverrides: IComponentsStylesOverrides,
		resetCompsManager: PlatformResetComps,
		propsStore: IPropsStore,
		structureStore: IStructureStore
	): SdkHandlersProvider<StoresSdkHandlers> & StoresSdkHandlers => {
		const stores = {
			updateProps: (partialProps: PropsMap) => {
				resetCompsManager.setPropsToOverride(partialProps)
				propsStore.update(partialProps)
			},
			updateStyles: (overrideStyles: PropsMap) => {
				resetCompsManager.setStylesToOverride(overrideStyles)
				const styleData = getStyles(overrideStyles, componentsStylesOverrides)
				componentsStylesOverrides.set(styleData)
			},
			updateStructure: (partialStructure: PropsMap) => {
				structureStore.update(partialStructure)
			},
		}
		return {
			stores,
			getSdkHandlers: () => ({
				stores,
			}),
		}
	}
)
