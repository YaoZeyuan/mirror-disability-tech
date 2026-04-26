import type React from 'react'
import { useMemo, useCallback } from 'react'
import type { AppStructureWithFeatures, Experiments } from '@wix/thunderbolt-symbols'
import type { RendererProps } from '../types'
import type { RenderComp } from '../components/StructureComponent'
import type { ElementData } from '@wix/thunderbolt-becky-types'
import { COMP_PATH_DELIMITER } from '@wix/thunderbolt-becky-types'
import { getInflatedItemId, REF_DELIMITER } from '@wix/thunderbolt-commons'
import { getChildScope, getSlotsScope, emptyScope } from '../components/scopesApi'
import type { ScopeData } from '../components/scopesApi'
import { mapValues, cloneDeep, isPlainObject } from 'lodash'

interface RenderProps {
	children: Array<React.ReactNode>
	backgroundLayer: Array<React.ReactNode>
	pinnedLayer: Array<React.ReactNode>
}

export type ElementToContainersData = Record<
	string,
	ElementData['containersData'] & {
		root?: ElementData['containersData']
	}
>

interface UseRenderPropsParams {
	compStructure: AppStructureWithFeatures['components'][string]
	elementToContainersData?: ElementToContainersData
	slots?: Record<string, string>
	parentScope: ScopeData
	propsStore: RendererProps['props']
	displayedItemId: string
	renderComp: RenderComp
	isDs: boolean
	compProps: Record<string, any>
	compId: string
	elementProps?: Record<string, any>
	parentCompPath?: string
	currentCompPath?: string
	experiments: Experiments
}

type ContainerType = 'template' | 'slot' | 'simple' | 'placeholder'
type RenderContainer = React.ReactNode | ((itemId: string, itemIndex: number) => React.ReactNode)
type ContainerTypeRender = (compId?: string) => RenderContainer

type ContainerProps = {
	rootContainers?: Record<string, RenderContainer>
	elementPropsWithRenderedContainers?: Record<string, Record<string, RenderContainer>>
}

type RenderLayers = {
	children?: Array<React.ReactNode>
	backgroundLayer?: Array<React.ReactNode>
	pinnedLayer?: Array<React.ReactNode>
}
type ItemArrayProps = Record<string, any>

type StructureComponentRenderProps = RenderLayers & ContainerProps & ItemArrayProps

const resolveElementPropsSlotRefsExperiment = 'specs.thunderbolt.resolveElementPropsSlotRefs'

export const useRenderProps = (params: UseRenderPropsParams): StructureComponentRenderProps => {
	const layers = useRenderLayers(params)
	const { elementPropsWithRenderedContainers, rootContainers } = useContainerProps(params)
	const itemArrayProps = useItemArrayProps(params)

	return {
		...layers,
		...rootContainers,
		...itemArrayProps,
		...(elementPropsWithRenderedContainers ? { elementProps: elementPropsWithRenderedContainers } : {}),
	}
}

/**
 * Maps layers to render props (children, backgroundLayer, pinnedLayer)
 */
const useRenderLayers = ({
	compProps,
	propsStore,
	displayedItemId,
	compId,
	parentScope,
	isDs,
	renderComp,
	compStructure,
	slots,
	parentCompPath,
}: UseRenderPropsParams) => {
	return useMemo(() => {
		const components = compStructure?.components ?? []
		const shouldMapLayers = Boolean(
			compStructure?.builderType && components.length > 0 && Object.keys(slots ?? {}).length === 0
		)

		if (!shouldMapLayers) {
			return {}
		}

		const RenderPropsResult: RenderProps = {
			children: [],
			backgroundLayer: [],
			pinnedLayer: [],
		}

		const { layers } = compProps
		const pinnedSet = new Set(layers?.pinned ?? [])
		const backgroundSet = new Set(layers?.background ?? [])

		const renderChild = (childId: string): React.ReactNode => {
			const childScope = isDs ? getChildScope(compId, parentScope) : emptyScope
			return renderComp(propsStore, childId, childScope, displayedItemId, parentCompPath)
		}

		const getLayerKey = (childId: string): keyof RenderProps => {
			if (backgroundSet.has(childId)) {
				return 'backgroundLayer'
			}
			if (pinnedSet.has(childId)) {
				return 'pinnedLayer'
			}
			return 'children'
		}

		return (components ?? []).reduce((acc, childId) => {
			const layer = getLayerKey(childId)
			acc[layer].push(renderChild(childId))
			return acc
		}, RenderPropsResult)
	}, [
		compStructure,
		slots,
		compProps,
		isDs,
		compId,
		parentScope,
		renderComp,
		propsStore,
		displayedItemId,
		parentCompPath,
	])
}

const useRenderSlot = ({
	parentScope,
	propsStore,
	displayedItemId,
	renderComp,
	parentCompPath,
}: UseRenderPropsParams) =>
	useCallback(
		(slotCompId?: string) => {
			if (!slotCompId) {
				return null
			}

			const firstScopeItem = parentScope.scope[0]
			const slotCompIdForScopeGetter = firstScopeItem ? firstScopeItem + REF_DELIMITER + slotCompId : slotCompId
			const slotsScope = getSlotsScope(parentScope, slotCompIdForScopeGetter)

			return renderComp(propsStore, slotCompId, slotsScope, displayedItemId, parentCompPath)
		},
		[parentScope, propsStore, displayedItemId, renderComp, parentCompPath]
	)

const useContainerProps = (params: UseRenderPropsParams): ContainerProps => {
	const {
		compStructure,
		elementToContainersData,
		slots,
		parentScope,
		propsStore,
		displayedItemId,
		renderComp,
		isDs,
		elementProps,
		parentCompPath,
		currentCompPath,
		experiments,
	} = params
	const renderSlotComp = useRenderSlot(params)

	const renderTemplateComp = useCallback(
		(itemId: string, itemIndex: number, templateCompId?: string) => {
			if (!templateCompId) {
				return null
			}

			const inflatedItemId = getInflatedItemId(itemId, displayedItemId)
			const childScope = isDs
				? getChildScope(templateCompId, parentScope, {
						parentType: 'Repeater',
						scopeId: inflatedItemId,
						itemIndex,
					})
				: emptyScope

			return renderComp(propsStore, templateCompId, childScope, inflatedItemId, parentCompPath)
		},
		[displayedItemId, isDs, parentScope, propsStore, renderComp, parentCompPath]
	)

	return useMemo(() => {
		if (!compStructure?.builderType) {
			return {}
		}

		const containerRenderers: Record<ContainerType, ContainerTypeRender> = {
			template: (compId?: string) => (itemId: string, itemIndex: number) =>
				renderTemplateComp(itemId, itemIndex, compId),
			slot: (compId?: string) => renderSlotComp(compId),
			simple: (compId?: string) => renderSlotComp(compId),
			placeholder: (compId?: string) => renderSlotComp(compId),
		}

		const resolvedElementProps = resolveInnerElementsPropsContainers(elementProps ?? {}, containerRenderers)
		const resolvedElementPropsWithSlots = experiments[resolveElementPropsSlotRefsExperiment]
			? resolveElementPropsSlotRefs(resolvedElementProps, renderSlotComp)
			: resolvedElementProps

		return {
			rootContainers: resolveRootContainers(containerRenderers, slots, elementToContainersData),
			elementPropsWithRenderedContainers: currentCompPath
				? injectCompPathsIntoElementProps(resolvedElementPropsWithSlots, currentCompPath)
				: resolvedElementPropsWithSlots,
		}
	}, [
		compStructure,
		elementToContainersData,
		renderSlotComp,
		renderTemplateComp,
		elementProps,
		slots,
		currentCompPath,
		experiments,
	])
}

function makeSlotRefProcessor(
	slotMap: Record<string, string>,
	renderSlotComp: (compId?: string) => React.ReactNode
): (value: any) => any {
	const processValue = (value: any): any => {
		if (typeof value === 'string' && slotMap[value]) {
			return renderSlotComp(slotMap[value])
		}
		if (Array.isArray(value)) {
			return value.map(processValue)
		}
		if (isPlainObject(value)) {
			return mapValues(value, processValue)
		}
		return value
	}
	return processValue
}

const useItemArrayProps = (params: UseRenderPropsParams) => {
	const renderSlotComp = useRenderSlot(params)
	const { compProps, slots, compStructure, experiments } = params

	const mapItemArrayProps = useCallback(
		(props: Record<string, any>) => {
			if (experiments[resolveElementPropsSlotRefsExperiment]) {
				const processValue = makeSlotRefProcessor(slots ?? {}, renderSlotComp)
				return mapValues(props, processValue)
			}

			const processValue = (value: any): any => {
				if (typeof value === 'string' && slots?.[value]) {
					return renderSlotComp(slots[value])
				}

				if (Array.isArray(value)) {
					return value.map(processValue)
				}

				if (typeof value === 'object' && value !== null) {
					return Object.entries(value).reduce<any>((acc, [key, val]) => {
						acc[key] = processValue(val)
						return acc
					}, {})
				}

				return value
			}

			return Object.entries(props).reduce<Record<string, any>>((acc, [key, value]) => {
				acc[key] = processValue(value)
				return acc
			}, {})
		},
		[renderSlotComp, slots, experiments]
	)

	return useMemo(() => {
		if (!compStructure?.builderType) {
			return {}
		}
		return mapItemArrayProps(compProps)
	}, [mapItemArrayProps, compProps, compStructure])
}

function resolveRootContainers(
	containerRenderers: Record<ContainerType, ContainerTypeRender>,
	slots: Record<string, string> | undefined,
	elementToContainersData?: ElementToContainersData
) {
	const rootContainersData = elementToContainersData?.root ?? {}
	return mapValues(rootContainersData, (containerData, containerName) => {
		const renderer = containerRenderers[containerData.containerType as ContainerType]
		return renderer(slots?.[containerName])
	})
}

function injectCompPathsIntoElementProps(elementProps: Record<string, any>, basePath: string): Record<string, any> {
	return mapValues(elementProps, (element, nickname) => {
		const nicknamePath = `${basePath}${COMP_PATH_DELIMITER}${nickname}`
		element.wix = { ...(element.wix ?? {}), compPath: nicknamePath }
		if (element.elementProps) {
			element.elementProps = injectCompPathsIntoElementProps(element.elementProps, nicknamePath)
		}
		return element
	})
}

function resolveInnerElementsPropsContainers(
	elementProps: Record<string, any>,
	containerRenderers: Record<ContainerType, ContainerTypeRender>
): Record<string, any> {
	const elementPropsWithRenderedContainers = cloneDeep(elementProps ?? {})

	return mapValues(elementPropsWithRenderedContainers, (element, key) => {
		return mapValues(element, (elementData, key) => {
			const isContainer = isPlainObject(elementData) && elementData.containerType
			if (isContainer) {
				const renderer = containerRenderers[elementData.containerType as ContainerType]
				return renderer(elementData.compId)
			}

			if (key === 'elementProps') {
				return resolveInnerElementsPropsContainers(elementData, containerRenderers)
			}

			return elementData
		})
	})
}

// resolveElementSlots may produce {compId} entries without containerType (when the manifest
// doesn't declare containersData for dynamic slots, e.g. Menu item containers).
// resolveInnerElementsPropsContainers skips those since it checks for containerType.
// This picks them up and resolves any matching UUID string refs in nested data (like items[].container).
function resolveElementPropsSlotRefs(
	elementProps: Record<string, any>,
	renderSlotComp: (compId?: string) => React.ReactNode
): Record<string, any> {
	return mapValues(elementProps, (element) => {
		const localSlots: Record<string, string> = {}
		for (const [key, val] of Object.entries(element) as Array<[string, any]>) {
			if (isPlainObject(val) && typeof val.compId === 'string' && !val.containerType) {
				localSlots[key] = val.compId
			}
		}

		if (Object.keys(localSlots).length === 0) {
			return element
		}

		const processValue = makeSlotRefProcessor(localSlots, renderSlotComp)
		return mapValues(element, (val, key) => {
			if (key in localSlots) {
				return val
			}

			if (key === 'elementProps') {
				return resolveElementPropsSlotRefs(val, renderSlotComp)
			}

			return processValue(val)
		})
	})
}
