import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'

import {
	LightboxSymbol,
	name,
	LightboxUtilsSymbol,
	CurrentLightboxSymbol,
	LightboxesAPISymbol,
	LightboxesResponseHandlerSymbol,
} from './symbols'
import { LifeCycle, PlatformEnvDataProviderSymbol, SiteLinkClickHandlerSymbol } from '@wix/thunderbolt-symbols'
import { Lightboxes } from './lightboxes'
import { CurrentLightbox } from './currentLightbox'
import { LightboxesPageNavigationHandler } from './lightboxesPageNavigationHandler'
import { LightboxLink } from './lightboxLink'
import { closeButtonWillMount, closeIconButtonWillMount, pageWillMount } from './lightboxCloseBehaviors'
import { LightboxUtils } from './lightboxUtils'
import { LightboxesEnvDataProvider } from './lightboxesEnvDataProvider'
import { ComponentWillMountSymbol } from 'feature-components'
import { LightboxesAPI } from './lightboxesAPI'
import { LightboxesResponseHandler } from './lightboxesResponseHandler'

export const site: ContainerModuleLoader = (bind) => {
	bind(CurrentLightboxSymbol).to(CurrentLightbox)
	bind(LightboxSymbol).to(Lightboxes)
	bind(PlatformEnvDataProviderSymbol).to(LightboxesEnvDataProvider)
	bind(LightboxUtilsSymbol).to(LightboxUtils)
	bind(SiteLinkClickHandlerSymbol).to(LightboxLink)
	bind(LifeCycle.AppWillLoadPageHandler).to(LightboxesPageNavigationHandler)
	bind(LightboxesAPISymbol).to(LightboxesAPI)
	bind(LightboxesResponseHandlerSymbol).to(LightboxesResponseHandler)
}

export const page: ContainerModuleLoader = (bind) => {
	bind(ComponentWillMountSymbol).to(closeIconButtonWillMount)
	bind(ComponentWillMountSymbol).to(closeButtonWillMount)
	bind(ComponentWillMountSymbol).to(pageWillMount)
}

export * from './types'
export { name, LightboxSymbol, LightboxUtilsSymbol }
