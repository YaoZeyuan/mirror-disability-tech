import type { IBaseStructureAPI, IPageAssetsLoader, IStructureStore } from '@wix/thunderbolt-symbols'
import { PageAssetsLoaderSymbol, Structure } from '@wix/thunderbolt-symbols'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IComponentsLoader } from '@wix/thunderbolt-components-loader'
import { ComponentsLoaderSymbol } from '@wix/thunderbolt-components-loader'

const BLOCKING_LAYER_BG_ID = 'BLOCKING_LAYER_BACKGROUND'

const POPUP_CONTAINER_BUILDER_COMPONENT_TYPE = 'wixSystemElements.PopupContainer'

const baseStructureAPI = (
	structureStore: IStructureStore,
	componentsLoader: IComponentsLoader,
	pageAssetsLoader: IPageAssetsLoader
): IBaseStructureAPI => {
	const isComponentInDynamicStructure = (compId: string) => {
		if (!structureStore.get('DYNAMIC_STRUCTURE_CONTAINER')) {
			return false
		}

		const { components } = structureStore.get('DYNAMIC_STRUCTURE_CONTAINER')

		return components.includes(compId)
	}
	return {
		get: (compId) => structureStore.get(compId),
		getCompPageId: (compId) => structureStore.get(compId)?.pageId,
		subscribeToChanges: (partial) => structureStore.subscribeToChanges(partial),
		getEntireStore: () => structureStore.getEntireStore(),
		getAllKeys: () => structureStore.getAllKeys(),
		getContextIdOfCompId: (compId: string) => structureStore.getContextIdOfCompId(compId),
		replaceComponentInParent: (parentId, oldCompId, newCompId) => {
			const parent = structureStore.get(parentId)
			const components = [...parent.components]

			const compIndex = components.indexOf(oldCompId)
			if (compIndex > -1) {
				components[compIndex] = newCompId

				structureStore.update({
					[parentId]: { ...parent, components },
				})
			}
		},
		getPageWrapperComponentId: (pageId: string, contextId: string = pageId) =>
			pageId === contextId ? `${pageId}_wrapper` : contextId,
		addComponentToDynamicStructure: async (compId, compStructure, additionalComponents) => {
			const structure = {
				[compId]: compStructure,
				...additionalComponents,
			}
			structureStore.update(structure)
			await componentsLoader.loadComponents(structure)

			if (isComponentInDynamicStructure(compId)) {
				return
			}

			const newComponents = [...structureStore.get('DYNAMIC_STRUCTURE_CONTAINER').components]

			const blockLayerBgIndex = newComponents.findIndex((comp) => comp === BLOCKING_LAYER_BG_ID)
			if (blockLayerBgIndex !== -1) {
				// We insert the new comp before both the BLOCKING_LAYER and BLOCKING_LAYER_BG components
				newComponents.splice(blockLayerBgIndex - 1, 0, compId)
			} else {
				newComponents.push(compId)
			}

			structureStore.update({
				DYNAMIC_STRUCTURE_CONTAINER: {
					componentType: 'DynamicStructureContainer',
					components: newComponents,
				},
			})
		},
		isComponentInDynamicStructure,
		removeComponentFromDynamicStructure: (compId) => {
			const { components } = structureStore.get('DYNAMIC_STRUCTURE_CONTAINER')
			structureStore.update({
				DYNAMIC_STRUCTURE_CONTAINER: {
					componentType: 'DynamicStructureContainer',
					components: components.filter((id) => id !== compId),
				},
			})
			// should we delete the comp structure..?
		},
		removeComponentFromParent: (parentId, compId) => {
			const parent = structureStore.get(parentId)
			if (!parent) {
				return
			}
			const components = parent.components.filter((id) => id !== compId)

			structureStore.update({
				[parentId]: { ...parent, components },
			})
		},
		addComponentToParent: (parentId, compId, index) => {
			const parent = structureStore.get(parentId)
			const components = index
				? [...parent.components.slice(0, index), compId, ...parent.components.slice(index)]
				: [...parent.components, compId]

			structureStore.update({
				[parentId]: { ...parent, components },
			})
		},
		cleanPageStructure: (contextId: string) => {
			structureStore.setChildStore(contextId)
		},
		loadPageStructure: async (
			pageId: string,
			contextId: string,
			options?: { loadComponentsPromise?: Promise<any> }
		) => {
			const pageStructure = await pageAssetsLoader.load(pageId, options).components
			structureStore.setChildStore(contextId, pageStructure)
			return pageStructure
		},
		getPopupContainerId: (pageId: string) => {
			const storeEntries = Object.entries(structureStore.getEntireStore())

			const popupContainer = storeEntries.find(([_, component]) => {
				const isMatchingPage = component.pageId === pageId
				const isPopupType =
					['PopupContainer', 'ResponsivePopupContainer'].includes(component.componentType) ||
					component.builderType === POPUP_CONTAINER_BUILDER_COMPONENT_TYPE
				return isMatchingPage && isPopupType
			})

			return popupContainer ? popupContainer[0] : null
		},
		updateStructure: (compId, compStructure) => {
			structureStore.update({ [compId]: compStructure })
		},
	}
}

export const BaseStructureAPI = withDependencies(
	[Structure, ComponentsLoaderSymbol, PageAssetsLoaderSymbol],
	baseStructureAPI
)
