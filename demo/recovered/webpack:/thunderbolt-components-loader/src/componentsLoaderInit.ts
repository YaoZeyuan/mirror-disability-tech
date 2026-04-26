import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IRendererPropsExtender } from '@wix/thunderbolt-symbols'
import { ComponentsLoaderSymbol } from './symbols'
import type { IComponentsLoader } from './IComponentLoader'

const componentsLoaderInit = (componentsLoader: IComponentsLoader): IRendererPropsExtender => {
	return {
		async extendRendererProps() {
			return {
				comps: componentsLoader.getComponentsMap(),
				compControllers: componentsLoader.getCompControllersMap(),
				getComponentToRender: componentsLoader.getComponentToRender,
				executeComponentWrappers: componentsLoader.executeComponentWrappers,
			}
		},
	}
}

export const ComponentsLoaderInit = withDependencies([ComponentsLoaderSymbol], componentsLoaderInit)
