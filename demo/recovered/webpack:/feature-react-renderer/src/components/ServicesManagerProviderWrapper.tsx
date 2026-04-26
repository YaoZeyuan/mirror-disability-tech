import type { ComponentType } from 'react'
import React, { Fragment, forwardRef } from 'react'
import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { Experiments } from '@wix/thunderbolt-symbols'
import { ExperimentsSymbol, SiteFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { name } from '../symbols'
import type { ReactRendererSiteConfig } from '../types'
import { ServicesManagerProvider } from '@wix/services-manager-react'
import type { ServicesManager } from '@wix/services-manager/types'

export const ServicesManagerProviderWrapper = withDependencies(
	[ExperimentsSymbol, named(SiteFeatureConfigSymbol, name)],
	(experiments: Experiments, siteConfig: ReactRendererSiteConfig) => {
		return {
			wrapComponent: (Component: ComponentType<any>, compType: string) => {
				const Wrapper = forwardRef<any, any>((props, ref) => {
					const isBuilder = siteConfig.isBuilderComponentModel
					const isServicesInfraEnabled = !!experiments['specs.thunderbolt.servicesInfra'] || isBuilder
					const pageCompTypes = new Set(['PageMountUnmount', 'MasterPage'])

					if (isServicesInfraEnabled && pageCompTypes.has(compType)) {
						const { servicesManager, ...restProps } = props
						const ServiceWrapper = (servicesManager ? ServicesManagerProvider : Fragment) as ComponentType<{
							servicesManager?: ServicesManager
							children?: React.ReactNode
						}>

						const serviceWrapperProps = servicesManager ? { servicesManager } : {}

						return (
							<ServiceWrapper {...serviceWrapperProps}>
								<Component {...restProps} ref={ref} />
							</ServiceWrapper>
						)
					}

					return <Component {...props} ref={ref} />
				})
				return Wrapper
			},
		}
	}
)
