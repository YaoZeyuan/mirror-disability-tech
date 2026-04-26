import type { ComponentLoaderFunction, IComponentsRegistrar } from '@wix/thunderbolt-components-loader'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { ReactLoaderForOOISymbol, name } from './symbols'
import type { OOIComponentData, OOIComponentLoader, OOISiteConfig } from './types'
import type { Reporter } from './reporting'
import { OOIReporterSymbol } from './reporting'
import { transform } from 'lodash'
import { getCompClassType } from '@wix/thunderbolt-commons'

const TPA_WIDGET_NATIVE_COMP_TYPE = 'tpaWidgetNative'

export const ooiComponentsRegistrar = withDependencies(
	[named(SiteFeatureConfigSymbol, name), ReactLoaderForOOISymbol, OOIReporterSymbol],
	(
		{ ooiComponentsData }: OOISiteConfig,
		ooiComponentsLoader: OOIComponentLoader,
		reporter: Reporter
	): IComponentsRegistrar => {
		const isSSR = !process.env.browser

		const loadComponent = async ({ widgetId }: { widgetId: OOIComponentData['widgetId'] }) => {
			const { component, waitForLoadableReady } = await ooiComponentsLoader.getComponent(widgetId)
			if (isSSR) {
				return { default: component }
			}

			const { sentryDsn } = ooiComponentsData[widgetId]

			if (!component) {
				console.error(`
					Component with widgetId: ${widgetId} is not exported from the OOIComponentsLoader.
					This might be due to a misconfiguration or a missing export in the component file, or a network issue.
					Check the console / network for network errors or misconfigurations.
					componentUrl: ${ooiComponentsData[widgetId].componentUrl}
				`)
				reporter.reportError(new Error('component is not exported'), sentryDsn, {
					tags: { phase: 'ooi component resolution' },
				})
			}

			return {
				default: component,
				waitForLoadableReady,
			}
		}

		const components = transform(
			ooiComponentsData,
			(res: Record<string, ComponentLoaderFunction<any>>, _, widgetId) => {
				res[getCompClassType(TPA_WIDGET_NATIVE_COMP_TYPE, widgetId)] = () => loadComponent({ widgetId })
			}
		)
		return {
			getComponents: () => components,
		}
	}
)
