import type { RendererProps } from '../types'
import Context from './AppContext'
import type { ComponentType } from 'react'
import React, { useContext, useCallback, useMemo } from 'react'
import { ErrorBoundary, DeadComp } from './ErrorBoundary'
import _ from 'lodash'
import { getDisplayedId, getDefaultCompId, getInflatedItemId } from '@wix/thunderbolt-commons'
import { useProps, useStoresObserver } from './hooks'
import { useRenderProps } from '../hooks/useRenderProps'
import { getChildScope, getScopesAttributes, emptyScope, getSlotsScope } from './scopesApi'
import type { ScopeData } from './scopesApi'
import type { AppStructureWithFeatures } from '@wix/thunderbolt-symbols'
import { COMP_PATH_DELIMITER } from '@wix/thunderbolt-becky-types'

// id is the actual DOM id and compId is the id of the comp in the structure
type StructureComponentProps = {
	id: string
	compId?: string
	scopeData: ScopeData
	displayedItemId?: string
	parentCompPath?: string
	wix?: { compPath: string } // TODO: change with wix prop type when available
}
export type RenderComp = (
	propsStore: RendererProps['props'],
	childId: string,
	scopeData: ScopeData,
	displayedItemId?: string,
	parentCompPath?: string
) => JSX.Element

const renderComp: RenderComp = (
	propsStore: RendererProps['props'],
	childId: string,
	scopeData: ScopeData,
	displayedItemId?: string,
	parentCompPath?: string
) => {
	const childProps = propsStore.get(childId)

	const defaultChildId = getDefaultCompId(childId)
	return (
		<StructureComponent
			displayedItemId={displayedItemId}
			compId={childId}
			scopeData={scopeData}
			id={defaultChildId}
			key={childProps?.key || (displayedItemId ? getDisplayedId(defaultChildId, displayedItemId!) : defaultChildId)}
			parentCompPath={parentCompPath}
		/>
	)
}
const StructureComponent: ComponentType<StructureComponentProps> = React.memo(
	({ id, compId = id, displayedItemId = '', scopeData = emptyScope, parentCompPath = '' }) => {
		const { structure: structureStore, disabledComponents, resolveRoutingBlocker } = useContext(Context)
		const displayedId = displayedItemId ? getDisplayedId(compId, displayedItemId) : compId

		const structure = structureStore.get(compId)
		const displayedStructure = structureStore.get(displayedId)
		const compStructure = displayedStructure ? { ...structure, ...displayedStructure } : structure || {}
		const { componentType, uiType, builderType } = compStructure
		const isCompDisabled = !!disabledComponents[componentType]
		const compClassType = uiType ? `${componentType}_${uiType}` : builderType || componentType

		useStoresObserver(compId, displayedId)
		resolveRoutingBlocker(displayedId)

		return (
			<StructureComponentInner
				id={id}
				key={`${id}_${compClassType}`}
				compId={compId}
				displayedItemId={displayedItemId}
				scopeData={scopeData}
				compStructure={compStructure}
				compClassType={compClassType}
				isCompDisabled={isCompDisabled}
				parentCompPath={parentCompPath}
			/>
		)
	}
)

type StructureComponentInnerProps = StructureComponentProps & {
	compStructure: AppStructureWithFeatures['components'][string]
	compClassType: string
	isCompDisabled: boolean
}

const StructureComponentInner: ComponentType<StructureComponentInnerProps> = ({
	id,
	compId = id,
	displayedItemId = '',
	scopeData = emptyScope,
	compStructure,
	compClassType,
	isCompDisabled,
	parentCompPath = '',
}) => {
	const isDs = process.env.PACKAGE_NAME === 'thunderbolt-ds'
	const {
		props: propsStore,
		logger,
		DeletedComponent,
		BaseComponent,
		getComponentToRender,
		experiments,
		notifyError,
	} = useContext(Context)

	const currentCompPath = parentCompPath ? `${parentCompPath}${COMP_PATH_DELIMITER}${compId}` : compId
	// begin accumulating the compPath only for page level components
	let parentCompPathForChildren =
		compStructure.componentType === 'Page' || currentCompPath !== compId ? currentCompPath : ''

	let displayedId = displayedItemId ? getDisplayedId(compId, displayedItemId) : compId
	const Comp: React.ComponentType<any> = getComponentToRender(compClassType, compStructure.indexInParent)
	if (!Comp) {
		notifyError?.({ type: 'feature not supported in app', error: new Error('Component Missing') })
		console.warn('Unknown component type for id', displayedId, '->', compClassType)
		logger.captureError(new Error(`Unknown component type for id ${displayedId} ${compClassType}`), {
			tags: { feature: 'StructureComponent' },
			extra: { compId: displayedId, compType: compClassType },
		})
	}

	// We do not want to pass on templateContainers to the render function of components
	const {
		elementToContainersData,
		templateContainers: _templateContainers,
		elementProps,
		...compProps
	} = useProps(displayedId, compId)

	const components = compStructure!.components
	const parentScope = scopeData
	const children = useCallback(
		(childScopeData?: { scopeId: string; parentType: string; itemIndex?: number }) =>
			(components || []).map((childId) => {
				let itemId = displayedItemId

				if (childScopeData?.parentType === 'Repeater') {
					itemId = getInflatedItemId(childScopeData!.scopeId, displayedItemId)
					parentCompPathForChildren = `${currentCompPath}${COMP_PATH_DELIMITER}[${childScopeData!.scopeId}]`
				}

				const childScope = isDs ? getChildScope(compId, parentScope, childScopeData) : emptyScope
				return renderComp(propsStore, childId, childScope, itemId, parentCompPathForChildren)
			}),
		[components, displayedItemId, compId, parentScope, propsStore, isDs, currentCompPath, parentCompPathForChildren]
	)

	const slots = compStructure!.slots

	const scopeAttr = isDs ? getScopesAttributes(scopeData) : {}
	const shouldRenderComp = !isCompDisabled && Comp

	// TODO: Remove the fallback once all components are implemented
	// in case comp is not inside repeater, remove hover box suffix if exist
	displayedId = displayedItemId ? displayedId : getDefaultCompId(id)

	const getSlotByItemId = useMemo(
		() => (slotName: string, itemId: string) => {
			const slotId = slots?.[`${slotName}`]
			if (!slotId) {
				return null
			}

			const slotsScope = getSlotsScope(parentScope, slotId)
			return renderComp(propsStore, slotId, slotsScope, itemId, parentCompPathForChildren)
		},
		[slots, propsStore, parentScope, parentCompPathForChildren]
	)

	const slotsProps = useMemo(
		() =>
			_.mapValues(slots, (slotId) => {
				const slotsScope = getSlotsScope(parentScope, slotId)
				return renderComp(propsStore, slotId, slotsScope, displayedItemId, parentCompPathForChildren)
			}),
		[slots, displayedItemId, propsStore, parentScope, parentCompPathForChildren]
	)

	const {
		children: childrenRenderProp,
		backgroundLayer,
		pinnedLayer,
		...renderProps
	} = useRenderProps({
		compProps,
		propsStore,
		displayedItemId,
		compId,
		parentScope,
		isDs,
		renderComp,
		compStructure,
		slots,
		elementToContainersData,
		elementProps,
		parentCompPath: parentCompPathForChildren,
		currentCompPath,
		experiments,
	})

	const shouldAddIdAsClassName = experiments['specs.thunderbolt.addIdAsClassName']

	// Build className: [becky classes] [component ID] [wix-select for editor]
	let className = renderProps.className || ''

	if (shouldAddIdAsClassName) {
		className = className ? `${className} ${displayedId}` : displayedId
	}

	// Add wix-select class for editor mode to identify root components in editor
	if (isDs) {
		className = className ? `${className} wix-select` : 'wix-select'
	}

	const finalRenderProps = {
		...renderProps,
		className,
	}

	const wixProp = useMemo(
		() => ({ ...(renderProps.wix || {}), compPath: currentCompPath }),
		[renderProps.wix, currentCompPath]
	)

	let component

	if (compStructure.deleted) {
		component = <DeletedComponent BaseComponent={BaseComponent} id={displayedId} compId={compId} />
	} else if (!shouldRenderComp) {
		component = <DeadComp id={displayedId} />
	} else {
		component = (
			<Comp
				{...finalRenderProps}
				{...(compStructure.builderType ? { children: childrenRenderProp, backgroundLayer, pinnedLayer } : { children })}
				compProps={compProps}
				getSlotByItemId={getSlotByItemId}
				{...scopeAttr}
				slots={slotsProps}
				id={displayedId}
				compId={compId}
				compClassType={compClassType}
				wix={wixProp}
			/>
		)
	}

	return (
		<ErrorBoundary
			id={displayedId}
			deleted={compStructure.deleted}
			logger={logger}
			Component={Comp}
			compClassType={compClassType}
		>
			{component}
		</ErrorBoundary>
	)
}

export default StructureComponent
