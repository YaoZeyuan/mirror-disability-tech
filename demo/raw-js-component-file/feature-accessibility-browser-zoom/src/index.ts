import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { LifeCycle } from '@wix/thunderbolt-symbols'
import { AccessibilityBrowserZoom } from './accessibilityBrowserZoom'
import { AccessibilityBrowserZoomSite } from './accessibilityBrowserZoomSite'

export { name } from './symbols'
export type { AccessibilityBrowserZoomPageConfig } from './types'

export const site: ContainerModuleLoader = (bind) => {
	bind(LifeCycle.AppDidMountHandler, LifeCycle.AppWillUnmountHandler).to(AccessibilityBrowserZoomSite)
}

export const page: ContainerModuleLoader = (bind) => {
	bind(LifeCycle.PageDidMountHandler, LifeCycle.PageDidUnmountHandler).to(AccessibilityBrowserZoom)
}
