import React, { Fragment, useEffect } from 'react'
import StructureComponent from './StructureComponent'
import Context from './AppContext'
import type { AppProps, AppContext } from '../types'
import { extendStoreWithSubscribe } from './extendStoreWithSubscribe'
import type { IPropsStore, IStructureStore, IStylesStore } from '@wix/thunderbolt-symbols'
import ComponentsStylesOverrides from './ComponentsStylesOverrides'
import type { ServicesManager } from '@wix/services-manager/types'

function App({
	structure,
	props,
	styles,
	compsLifeCycle,
	compEventsRegistrar,
	comps,
	compControllers,
	logger,
	batchingStrategy,
	onDidMount = () => {},
	layoutDoneService,
	stateRefs,
	rootCompId,
	getCompBoundedUpdateProps,
	getCompBoundedUpdateStyles,
	BaseComponent,
	DeletedComponent,
	disabledComponents = {},
	experiments,
	setIsWaitingSuspense,
	getIsWaitingSuspense,
	getComponentToRender,
	executeComponentWrappers,
	componentCssRenderer,
	registerRoutingBlocker,
	resolveRoutingBlocker,
	notifyError,
	ServicesManagerProvider,
	servicesManager,
	isBuilderComponentModel,
}: AppProps) {
	const contextValue: AppContext = {
		structure: extendStoreWithSubscribe<IStructureStore>(structure, batchingStrategy, layoutDoneService),
		props: extendStoreWithSubscribe<IPropsStore>(props, batchingStrategy, layoutDoneService),
		stateRefs: extendStoreWithSubscribe<IPropsStore>(stateRefs, batchingStrategy, layoutDoneService),
		styles: extendStoreWithSubscribe<IStylesStore>(styles, batchingStrategy),
		compsLifeCycle,
		compEventsRegistrar,
		logger,
		comps,
		compControllers,
		getCompBoundedUpdateProps,
		getCompBoundedUpdateStyles,
		BaseComponent,
		DeletedComponent,
		disabledComponents,
		experiments,
		setIsWaitingSuspense,
		getIsWaitingSuspense,
		getComponentToRender,
		executeComponentWrappers,
		batchingStrategy,
		layoutDoneService,
		componentCssRenderer,
		registerRoutingBlocker,
		resolveRoutingBlocker,
		notifyError,
	}

	useEffect(onDidMount, [onDidMount])

	const isServicesInfra = Boolean(experiments['specs.thunderbolt.servicesInfra']) || Boolean(isBuilderComponentModel)
	const shouldWrapWithServicesContext = isServicesInfra && ServicesManagerProvider && servicesManager
	const ServiceWrapper = (shouldWrapWithServicesContext ? ServicesManagerProvider : Fragment) as (props: {
		// Export type from @wix/services-manager-react
		servicesManager: ServicesManager
		children?: React.ReactNode
	}) => React.JSX.Element
	const serviceWrapperProps = (shouldWrapWithServicesContext ? { servicesManager } : {}) as {
		servicesManager: ServicesManager
	}

	return (
		<Fragment>
			<ServiceWrapper {...serviceWrapperProps}>
				<Context.Provider value={contextValue}>
					<ComponentsStylesOverrides />
					<StructureComponent key={rootCompId} id={rootCompId} scopeData={{ scope: [], repeaterItemsIndexes: [] }} />
				</Context.Provider>
			</ServiceWrapper>
		</Fragment>
	)
}

export default App
