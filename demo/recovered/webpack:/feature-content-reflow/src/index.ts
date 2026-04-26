import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { ContentReflow } from './contentReflow'
import { LifeCycle } from '@wix/thunderbolt-symbols'
import { ComponentsRegistrarSymbol } from '@wix/thunderbolt-components-loader'
import { ContentReflowBannerRegistrar } from './contentReflowRegistrar'
import { ContentReflowVisibilitySymbol, ContentReflowZoomDetectionSymbol } from './symbols'
import { ContentReflowBannerVisibility } from './contentReflowVisibility'
import { ContentReflowZoomDetection } from './contentReflowZoomDetection'

export const site: ContainerModuleLoader = (bind) => {
	bind(ComponentsRegistrarSymbol).to(ContentReflowBannerRegistrar)
}

export const page: ContainerModuleLoader = (bind) => {
	bind(LifeCycle.PageDidMountHandler).to(ContentReflow)
	bind(ContentReflowVisibilitySymbol).to(ContentReflowBannerVisibility)
	bind(ContentReflowZoomDetectionSymbol).to(ContentReflowZoomDetection)
}
