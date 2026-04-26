import type { IStructureStore } from '@wix/thunderbolt-symbols'

// Helper function to check if a component is a HeaderSection RefComponent
const isHeaderSectionRefComponent = (structure: Record<string, any>, componentId: string): boolean => {
	const component = structure[componentId]

	if (!component) {
		return false
	}

	// Check if this is a RefComponent with components
	if (component.componentType === 'RefComponent' && component.components && component.components.length > 0) {
		// Get the referenced component (first component in RefComponent's components array)
		const referencedComponentId = component.components[0]
		const referencedComponent = structure[referencedComponentId]

		return referencedComponent && referencedComponent.componentType === 'HeaderSection'
	}

	return false
}

// Helper function to find header section in container components
const findHeaderSectionInContainer = (structure: Record<string, any>, container: any): boolean => {
	if (!container || !container.components) {
		return false
	}

	// Look through container's components for RefComponents and PinnedLayers
	for (const componentId of container.components) {
		const component = structure[componentId]

		// Check if this is a RefComponent that contains a HeaderSection
		if (isHeaderSectionRefComponent(structure, componentId)) {
			return true
		}

		// Check if this is a PinnedLayer and recursively search through its components
		if (component?.componentType === 'PinnedLayer' && component.components?.length > 0) {
			// Recursively search through PinnedLayer's components
			if (findHeaderSectionInContainer(structure, component)) {
				return true
			}
		}
	}

	return false
}

// Will find if the page has a header section on studio sites
export const hasHeaderSectionResponsive = (
	structureStore: IStructureStore,
	pageId: string,
	cache?: Record<string, boolean>
): boolean => {
	if (cache) {
		const cached = cache[pageId]
		if (cached !== undefined) {
			return cached
		}
	}

	const containerKey = `Container${pageId}`
	const container = structureStore.get(containerKey)
	const structure = structureStore.getEntireStore()
	const result = findHeaderSectionInContainer(structure, container)

	if (cache) {
		cache[pageId] = result
	}

	return result
}

// Determines if the skip to content button should be excluded when there are no headers.
// we don
export const shouldExcludeSkipToContentBtn = (
	pageId: string,
	isLandingPage: boolean,
	isResponsive: boolean,
	structureStore: IStructureStore,
	cache?: Record<string, boolean>
): boolean => {
	return isLandingPage || (isResponsive && !hasHeaderSectionResponsive(structureStore, pageId, cache))
}
