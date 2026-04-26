import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { ICompEventsRegistrar } from '@wix/thunderbolt-symbols'
import { PageFeatureConfigSymbol, CompEventsRegistrarSym } from '@wix/thunderbolt-symbols'
import { name, LightboxSymbol } from './symbols'
import type { ILightbox } from '.'
import type { ComponentWillMount, ViewerComponent } from 'feature-components'

export const closeIconButtonWillMount = withDependencies(
	[LightboxSymbol, CompEventsRegistrarSym],
	(lightboxApi: ILightbox, compEventsRegistrar: ICompEventsRegistrar): ComponentWillMount<ViewerComponent> => {
		return {
			componentTypes: ['PopupCloseIconButton'],
			componentWillMount(closeButton) {
				compEventsRegistrar.register(closeButton.id, 'onClick', lightboxApi.close)
			},
		}
	}
)

export const closeButtonWillMount = withDependencies(
	[named(PageFeatureConfigSymbol, name), LightboxSymbol, CompEventsRegistrarSym],
	(
		{ closeSiteButtons },
		lightboxApi: ILightbox,
		compEventsRegistrar: ICompEventsRegistrar
	): ComponentWillMount<ViewerComponent> => {
		return {
			componentTypes: ['SiteButton'],
			componentWillMount(closeButton) {
				if (closeSiteButtons[closeButton.id]) {
					compEventsRegistrar.register(closeButton.id, 'onClick', lightboxApi.close)
				}
			},
		}
	}
)

export const pageWillMount = withDependencies(
	[named(PageFeatureConfigSymbol, name), LightboxSymbol, CompEventsRegistrarSym],
	(
		{ popupsWithCloseOnOverlayClick },
		lightboxApi: ILightbox,
		compEventsRegistrar: ICompEventsRegistrar
	): ComponentWillMount<ViewerComponent> => {
		return {
			componentTypes: ['PopupPage', 'ResponsivePopupPage'],
			componentWillMount(page) {
				if (popupsWithCloseOnOverlayClick[page.id]) {
					compEventsRegistrar.register(page.id, 'onClick', lightboxApi.close)
				}
			},
		}
	}
)
