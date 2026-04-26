import { multi, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	AppStructure,
	Experiments,
	ICurrentRouteInfo,
	IDomSelectors,
	ILogger,
	INavigationManager,
	SuspendedCompsAPI,
	ViewerModel,
} from '@wix/thunderbolt-symbols'
import {
	ComponentLibrariesSymbol,
	CurrentRouteInfoSymbol,
	DomSelectorsSymbol,
	ExperimentsSymbol,
	LoggerSymbol,
	NavigationManagerSymbol,
	SuspendedCompsSym,
	ViewerModelSym,
} from '@wix/thunderbolt-symbols'
import type {
	ComponentsLoaderRegistry,
	ComponentsRegistry,
	ComponentLibraries,
	CompControllersRegistry,
	IComponentsRegistrar,
	ComponentModule,
	ComponentLoaderFunction,
} from './types'
import type { IComponentsLoader } from './IComponentLoader'
import { getCompClassType, taskify, createViewportObserver } from '@wix/thunderbolt-commons'
import { ComponentsRegistrarSymbol, ExecuteComponentWrappersSymbol } from './symbols'

import { createSsrSuspenseWrapper, createSuspenseWrapper, WithHydrateWrapperCSR } from './suspenseManagerClient'
import { WithHydrateWrapperSSR } from './suspenseManagerSSR'
import { isLazyLoadCompatible } from './helpers'
import { SafeHydrationWrapper } from './SSRWrapper'

const CONTAINERS_COMP_TYPES = ['Section', 'ClassicSection', 'FooterSection']
const TPA_WIDGET_NATIVE_COMP_TYPE = 'tpaWidgetNative'

const COMP_TYPES_LAZY_BLACKLIST_PREFIXES = [
	'MasterPage',
	'HeaderContainer',
	'StylableHorizontalMenu',
	'DivWithChildren',
	'Page',
	'RefComponent',
	'HeaderSection',
	'HamburgerMenuRoot',
	'HamburgerMenuContent',
	'HamburgerCloseButton',
	'HamburgerOverlay',
	'HamburgerMenuContainer',
	'MegaMenuContainerItem',
	'Submenu',
	'ResponsiveContainer',
	'Anchor',
	'PagesContainer',
	'HeaderContainer',
	'FooterContainer',
	'PageGroup',
	'BackgroundGroup',
	'FreemiumBannerDesktop',
	'SkipToContentButton',
	'PageBackground',
	'DynamicStructureContainer',
]
const SECTIONS_ABOVE_FOLD_COUNT = 3

const isCsr = !!process.env.browser
const isEditor = process.env.PACKAGE_NAME === 'thunderbolt-ds'

type ComponentsLoaderFactory = (
	componentsLibraries: ComponentLibraries,
	componentsRegistrars: Array<IComponentsRegistrar>,
	logger: ILogger,
	viewerModel: ViewerModel,
	suspendedComps: SuspendedCompsAPI,
	executeWrappers: {
		executeWrappers: (
			Component: ComponentModule<unknown>['component'],
			compType?: string
		) => ComponentModule<unknown>['component']
	},
	navigationManager: INavigationManager,
	experiments: Experiments,
	currentRouteInfo: ICurrentRouteInfo,
	domSelectors: IDomSelectors
) => IComponentsLoader

const isComponentModule = <T>(loader: any): loader is ComponentModule<T> => !!loader.component

export const componentsLoaderFactory: ComponentsLoaderFactory = (
	componentsLibraries,
	componentsRegistrars,
	logger,
	viewerModel,
	suspendedComps,
	{ executeWrappers },
	navigationManager,
	experiments,
	currentRouteInfo,
	domSelectors
) => {
	const lazyManifestsResolvers: Array<() => Promise<void>> = []
	const componentsLoaderRegistry: ComponentsLoaderRegistry = {}
	const componentsLoadedRegistry: ComponentsRegistry = {}
	const componentLazyLoadRegistry: ComponentsRegistry = {}
	const suspendedComponentsRegistry: ComponentsRegistry = {}
	const compControllersRegistry: CompControllersRegistry = {}
	const suspenseBlacklist =
		viewerModel.react18HydrationBlackListWidgets?.reduce(
			(acc, widgetId) => {
				acc[getCompClassType(TPA_WIDGET_NATIVE_COMP_TYPE, widgetId)] = true
				return acc
			},
			{} as Record<string, boolean>
		) || {}
	const debugRendering = viewerModel.requestUrl.includes('debugRendering=true')
	const shouldSuspenseContainers =
		viewerModel.experiments['specs.thunderbolt.viewport_hydration_extended_react_18'] &&
		!viewerModel.react18HydrationBlackListWidgets?.length
	let isCurrentPageLazyLoadCompatible = false
	const useReactLazyInSsr = viewerModel.experiments['specs.thunderbolt.useReactLazyInSsr']

	const isPageRenderedFromSsr = () =>
		!currentRouteInfo.didLandOnProtectedPage() &&
		navigationManager.isFirstPage() &&
		(!isCsr || !window.clientSideRender)

	// Disable lazy loading/suspense on protected pages to ensure consistent component registry behavior.
	// On protected pages, isCurrentPageLazyLoadCompatible can change between registration and render
	// (e.g., when dynamic components like TPA worker are added after password entry), which would
	// cause components to be stored in one registry but looked up from another.
	const shouldApplySuspenseInPage = () =>
		isLazyLoadCompatible(viewerModel) &&
		(isCurrentPageLazyLoadCompatible || isPageRenderedFromSsr()) &&
		!currentRouteInfo.didLandOnProtectedPage()

	const getComponentLoader = async (compType: string) => {
		const loader = componentsLoaderRegistry[compType]

		if (!loader && lazyManifestsResolvers.length) {
			await Promise.all(lazyManifestsResolvers.map((resolver) => resolver()))
			return componentsLoaderRegistry[compType]
		}

		return loader
	}

	const loadComponentModule = async (compType: string, useRegistry = true) => {
		if (useRegistry && componentsLoadedRegistry[compType]) {
			return { component: componentsLoadedRegistry[compType] }
		}
		const loader = await getComponentLoader(compType)
		isCsr && (await window.externalsRegistry.react.loaded) // components require React within their code so they have to be evaluated once React is defined.

		const module = await logger.runAsyncAndReport(
			() => {
				return taskify(() => loader())
			},
			`loadComponentModule-${compType}`,
			`Load Component Module: ${compType}`
		)

		if (isComponentModule(module)) {
			module.component.displayName = compType
			if (module.controller) {
				compControllersRegistry[compType] = module.controller
			}
			isCsr && (await window.externalsRegistry.react.loaded)
			return { ...module, component: executeWrappers(module.component, compType) }
		}
		return { ...module, component: executeWrappers(module.default, compType) }
	}

	const createSuspenseComponentCSR = (compType: string) => {
		if (suspendedComponentsRegistry[compType]) {
			return suspendedComponentsRegistry[compType]
		}
		const deferredComponentLoaderFactory = (compId: string) => {
			if (!shouldApplySuspenseInPage()) {
				return {
					componentPromise: Promise.resolve(loadComponentModule(compType, false).then((module) => module.component)),
					onUnmount: () => {},
				}
			}
			const { promise: viewportObserverPromise, cleaner: viewportObserverCleaner } = createViewportObserver(
				compId,
				domSelectors.getByCompId
			)
			return {
				componentPromise: viewportObserverPromise
					.then(() => loadComponentModule(compType, false))
					.then(async (module: any) => {
						if (!componentsLoadedRegistry[compType]) {
							componentsLoadedRegistry[compType] = module.component
						}
						if (module.waitForLoadableReady) {
							const { waitForLoadableReady } = module
							await waitForLoadableReady?.(compId)
						}
						return module.component
					}),
				onUnmount: viewportObserverCleaner,
			}
		}
		const comp = WithHydrateWrapperCSR({
			deferredComponentLoaderFactory,
			setIsWaitingSuspense: suspendedComps.setIsWaitingSuspense,
			debugRendering,
			logger,
			...(isCurrentPageLazyLoadCompatible && !isPageRenderedFromSsr() && { placeholderHeight: 100 }),
		})
		return comp
	}

	const createSuspenseComponentSSR = async (compType: string) => {
		const Comp = (await loadComponentModule(compType)).component
		return WithHydrateWrapperSSR({
			Comp,
		})
	}

	const createSuspenseComponent = isCsr ? createSuspenseComponentCSR : createSuspenseComponentSSR

	const registerComponent = async (compType: string) => {
		return shouldSuspenseComponent(compType) ? registerSuspendedComponent(compType) : loadAndRegisterComponent(compType)
	}

	const shouldReportMissingLoader = (compType: string) => !isEditor && isOOI(compType)

	const getEnhancedErrorMessage = (compType: string, context: string) => {
		if (isOOI(compType)) {
			// Extract widget ID from compType (format: tpaWidgetNative_{WIDGET_ID})
			const widgetId = compType.replace(`${TPA_WIDGET_NATIVE_COMP_TYPE}_`, '')
			return [
				`${context} -> Component loader for ${compType} is not defined.`,
				``,
				`Widget ID: ${widgetId}`,
				``,
				`This error occurs when the widget is not registered in ooiComponentsData.`,
				`This is likely due to a clientSpecMap configuration issue or a caching issue.`,
				``,
				`Common causes:`,
				`  1. Missing 'componentFields' section in the Widget definition (CSM)`,
				`  2. Missing 'componentFields.componentUrl' or 'componentUrlTemplate' in CSM`,
				`  3. Stale cache - widget configuration was recently updated but cache not cleared`,
				`  4. clientSpecMap failed to load or returned incomplete data`,
				`  5. Invalid componentUrlTemplate or missing DAC overrides`,
				``,
				`Troubleshooting steps:`,
				`  1. Check browser console and network tab for clientSpecMap loading errors`,
				`  2. Verify the Widget exists in CSM with widgetId: ${widgetId}`,
				`  3. Ensure 'componentFields.componentUrl' or 'componentUrlTemplate' is set in CSM`,
				`  4. Try clearing browser cache and hard refresh (Ctrl+Shift+R / Cmd+Shift+R)`,
				`  5. Check if widget was recently added/updated - may need cache invalidation`,
				`  6. Verify DAC (Deployment Artifact Configuration) overrides if using templates`,
				``,
				`Technical note: Widgets without componentUrl are filtered out during viewer model construction.`,
			].join('\n')
		}
		return `${context} -> Component loader for ${compType} is not defined`
	}

	const loadAndRegisterComponent = async (compType: string) => {
		if (componentsLoadedRegistry[compType]) {
			return
		}
		const loader = await getComponentLoader(compType)

		if (!loader) {
			if (shouldReportMissingLoader(compType)) {
				const message = getEnhancedErrorMessage(compType, 'loadAndRegisterComponent')
				console.error(message)
				logger.captureError(new Error(message), { tags: { feature: 'components' } })
			}
			return
		}
		// components require React within their code so they have to be evaluated once React is defined.
		isCsr && (await window.externalsRegistry.react.loaded)
		if (shouldLazyLoadComponent(compType)) {
			if (componentLazyLoadRegistry[compType]) {
				return
			}
			const params = {
				loadComponentModule: () =>
					loadComponentModule(compType, false).then((module) => {
						// we need to set the loaded flag in order to know we should wait for the component to load on navigation
						if (!componentsLoadedRegistry[compType]) {
							componentsLoadedRegistry[compType] = module.component
						}
						return module
					}),
				setIsWaitingSuspense: suspendedComps.setIsWaitingSuspense,
				getIsWaitingSuspense: suspendedComps.getIsWaitingSuspense,
				logger,
				debugRendering,
			}
			componentLazyLoadRegistry[compType] =
				isCsr || useReactLazyInSsr ? createSuspenseWrapper(params) : await createSsrSuspenseWrapper(params)
		} else {
			const component = (await loadComponentModule(compType)).component
			if (!componentsLoadedRegistry[compType]) {
				componentsLoadedRegistry[compType] = component
			}
		}
	}

	const registerSuspendedComponent = async (compType: string) => {
		if (suspendedComponentsRegistry[compType]) {
			return
		}

		const loader = await getComponentLoader(compType)

		if (!loader) {
			if (shouldReportMissingLoader(compType)) {
				const message = getEnhancedErrorMessage(compType, 'registerSuspendedComponent')
				console.error(message)
				logger.captureError(new Error(message), { tags: { feature: 'components' } })
			}
			return
		}
		// components require React within their code so they have to be evaluated once React is defined.
		isCsr && (await window.externalsRegistry.react.loaded)
		suspendedComponentsRegistry[compType] = await createSuspenseComponent(compType)
	}

	const shouldLazyLoadComponent = (compType: string) =>
		shouldSuspenseContainers &&
		shouldApplySuspenseInPage() &&
		!COMP_TYPES_LAZY_BLACKLIST_PREFIXES.find((prefix) => compType.startsWith(prefix))

	const isOOI = (compType: string) => compType.startsWith(TPA_WIDGET_NATIVE_COMP_TYPE)

	// We only suspense OOI in the first page form SSR
	const shouldSuspenseOOI = (compType: string) =>
		isOOI(compType) && experiments['specs.thunderbolt.ooi_lazy_load_components'] && isPageRenderedFromSsr()

	// We suspense containers listet in CONTAINERS_COMP_TYPES on the first page form SSR and on next pages without blacklisted features
	const shouldSuspenseContainer = (compType: string, indexInParent?: number) =>
		shouldSuspenseContainers &&
		(isPageRenderedFromSsr() ||
			(isCurrentPageLazyLoadCompatible && indexInParent !== undefined && indexInParent >= SECTIONS_ABOVE_FOLD_COUNT)) &&
		CONTAINERS_COMP_TYPES.find((type) => compType.startsWith(type))

	const shouldSuspenseComponent = (compType: string, indexInParent?: number) =>
		isLazyLoadCompatible(viewerModel) &&
		!suspenseBlacklist[compType] &&
		(shouldSuspenseOOI(compType) || shouldSuspenseContainer(compType, indexInParent))

	const getRequiredComps = (structure: AppStructure) => {
		const allCompClassTypes = Object.entries(structure).map(([_, { componentType, uiType }]) => {
			const compClassType = getCompClassType(componentType, uiType)
			return compClassType
		})
		const uniqueCompTypes = [...new Set(allCompClassTypes)]
		return uniqueCompTypes
	}

	const registerLibraries = taskify(async () => {
		const assignComponents = (components: Record<string, any>) => {
			Object.assign(componentsLoaderRegistry, components)
		}

		logger.phaseStarted('componentsLibraries')
		const libs = [...componentsRegistrars, ...(await componentsLibraries)]
		logger.phaseEnded('componentsLibraries')

		logger.phaseStarted('componentLoaders')
		libs.forEach(({ getAllComponentsLoaders, getComponents }) => {
			assignComponents(getComponents())

			if (getAllComponentsLoaders) {
				lazyManifestsResolvers.push(async () => {
					assignComponents(await getAllComponentsLoaders())
				})
			}
		})
		logger.phaseEnded('componentLoaders')
	})

	const getComponentToRender = (compType: string, indexInParent?: number) => {
		let Comp
		if (shouldSuspenseComponent(compType, indexInParent)) {
			Comp = suspendedComponentsRegistry[compType]
		} else if (shouldLazyLoadComponent(compType)) {
			Comp = componentLazyLoadRegistry[compType]
		} else {
			Comp =
				componentsLoadedRegistry[compType] ||
				suspendedComponentsRegistry[compType] ||
				componentLazyLoadRegistry[compType]
		}
		return Comp
	}

	return {
		getComponentsMap: () => componentsLoadedRegistry,
		getCompControllersMap: () => compControllersRegistry,
		loadComponents: async (structure, isPageLazyLoadCompatible = false) => {
			isCurrentPageLazyLoadCompatible = isPageLazyLoadCompatible
			await registerLibraries
			const requiredComps = getRequiredComps(structure)
			return Promise.all(requiredComps.map((compType) => registerComponent(compType)))
		},
		loadAllComponents: async () => {
			await registerLibraries
			const requiredComps = Object.keys(componentsLoaderRegistry)
			return Promise.all(requiredComps.map((compType) => registerComponent(compType)))
		},
		loadComponent: async (componentType: string, uiType?: string) => {
			await registerLibraries
			const compType = getCompClassType(componentType, uiType)
			return registerComponent(compType)
		},
		registerComponent: (compType: string, loader: ComponentLoaderFunction<any>, { uiType } = {}) => {
			const componentType = getCompClassType(compType, uiType)
			componentsLoaderRegistry[componentType] = loader
			return loadAndRegisterComponent(componentType)
		},
		unregisterComponent: (compType: string, { uiType } = {}) => {
			const componentType = getCompClassType(compType, uiType)
			delete componentsLoaderRegistry[componentType]
			delete componentsLoadedRegistry[componentType]
			delete componentLazyLoadRegistry[componentType]
			delete suspendedComponentsRegistry[componentType]
			delete compControllersRegistry[componentType]
		},
		getComponentToRender: (compType: string, indexInParent?: number): React.ComponentType<any> => {
			if (!compType) {
				console.warn('getComponentToRender received invalid compType argument', compType)
				// @ts-ignore
				return null
			}
			const Comp = getComponentToRender(compType, indexInParent)
			if (
				experiments['specs.thunderbolt.disableSpecificCompsInSSR'] &&
				viewerModel.excludeCompsForSSRList?.includes(compType)
			) {
				// @ts-ignore
				return SafeHydrationWrapper(Comp)
			}
			return Comp
		},
		executeComponentWrappers: (Component: React.ComponentType<any>) => executeWrappers(Component),
	}
}

export const ComponentsLoader = withDependencies(
	[
		ComponentLibrariesSymbol,
		multi(ComponentsRegistrarSymbol),
		LoggerSymbol,
		ViewerModelSym,
		SuspendedCompsSym,
		ExecuteComponentWrappersSymbol,
		NavigationManagerSymbol,
		ExperimentsSymbol,
		CurrentRouteInfoSymbol,
		DomSelectorsSymbol,
	] as const,
	componentsLoaderFactory
)
