import { multi, withDependencies } from '@wix/thunderbolt-ioc'
import type { IAppWillMountHandler, IAppDidMountHandler, IStructureAPI, ILogger } from '@wix/thunderbolt-symbols'
import {
	LifeCycle,
	StructureAPI as StructureAPISym,
	CurrentRouteInfoSymbol,
	LoggerSymbol,
} from '@wix/thunderbolt-symbols'
import type { IRendererPropsProvider } from 'feature-react-renderer'
import { RendererPropsProviderSym } from 'feature-react-renderer'
import type { IThunderboltClient } from './types'
import { taskify } from '@wix/thunderbolt-commons'
import type { ICurrentRouteInfo } from 'feature-router'

export const thunderboltFactory = withDependencies(
	[
		multi(LifeCycle.AppWillMountHandler),
		multi(LifeCycle.AppDidMountHandler),
		StructureAPISym,
		CurrentRouteInfoSymbol,
		RendererPropsProviderSym,
		LoggerSymbol,
	] as const,
	(
		appWillMountHandlers: Array<IAppWillMountHandler>,
		appDidMountHandlers: Array<IAppDidMountHandler>,
		structureAPI: IStructureAPI,
		currentRouteInfo: ICurrentRouteInfo,
		rendererProps: IRendererPropsProvider,
		logger: ILogger
	): IThunderboltClient => ({
		ready: async () => {
			logger.phaseStarted('features_appWillMount', {}, { shouldReportSsrBi: true })
			const initThings = appWillMountHandlers.map((appWillMountHandler) =>
				taskify(() => appWillMountHandler.appWillMount())
			)
			logger.phaseStarted('structureAPI_addShellStructure')
			await structureAPI.addShellStructure()
			logger.phaseEnded('structureAPI_addShellStructure')
			await Promise.all([rendererProps.resolveRendererProps(), ...initThings])
			logger.phaseEnded('features_appWillMount', {}, { shouldReportSsrBi: true })
		},
		appDidMount: () => {
			appDidMountHandlers.map((appDidMountHandler) => appDidMountHandler.appDidMount())
			const route = currentRouteInfo.getCurrentRouteInfo()
			return {
				firstPageId: (route && route.pageId) || 'PROTECTED',
			}
		},
		getRendererProps: () => rendererProps.getRendererProps(),
	})
)
