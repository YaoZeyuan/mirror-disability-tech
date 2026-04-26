import type { IPropsStore, IStructureAPI, Experiments } from '@wix/thunderbolt-symbols'
import {
	FeatureExportsSymbol,
	MasterPageFeatureConfigSymbol,
	Props,
	StructureAPI,
	PagesMapSymbol,
	ExperimentsSymbol,
} from '@wix/thunderbolt-symbols'
import type { IPagesMap } from 'feature-router'
import type { ILightboxesAPI, LightboxesMasterPageConfig } from './types'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { name } from './symbols'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'

function setAriaLabel({
	structureAPI,
	lightboxPageId,
	propsStore,
	pagesMap,
}: {
	structureAPI: IStructureAPI
	lightboxPageId: string
	propsStore: IPropsStore
	pagesMap: IPagesMap
}) {
	const popupContainerId = structureAPI.getPopupContainerId(lightboxPageId)
	const popupContainerProps = popupContainerId != null ? propsStore.get(popupContainerId) : null
	const ariaLabel =
		popupContainerProps?.ariaLabel ||
		popupContainerProps?.a11y?.ariaLabel ||
		pagesMap.getPageById(lightboxPageId)?.title

	propsStore.update({
		POPUPS_ROOT: {
			ariaLabel,
			className: 'theme-vars',
		},
	})
}

const lightboxesAPI = (
	structureAPI: IStructureAPI,
	masterPageConfig: LightboxesMasterPageConfig,
	lightboxExports: IFeatureExportsStore<typeof name>,
	propsStore: IPropsStore,
	pagesMap: IPagesMap,
	experiments: Experiments
): ILightboxesAPI => {
	return {
		addLightboxToDynamicStructure: (lightboxPageId) => {
			const wrapperId = structureAPI.getPageWrapperComponentId(lightboxPageId, lightboxPageId)
			setAriaLabel({ structureAPI, lightboxPageId, propsStore, pagesMap })
			propsStore.update({
				POPUPS_ROOT: { showPopupsAboveImages: !!experiments['specs.thunderbolt.showPopupsAboveImages'] },
			})
			lightboxExports.export({ lightboxPageId })
			return structureAPI.addComponentToDynamicStructure(
				'POPUPS_ROOT',
				{
					componentType: 'PopupRoot',
					components: [wrapperId],
					uiType: masterPageConfig.isResponsive ? 'Responsive' : 'Classic',
				},
				{
					[wrapperId]: {
						componentType: 'PageMountUnmount',
						components: [lightboxPageId],
					},
				}
			)
		},
		removeLightboxFromDynamicStructure: (lightboxPageId) => {
			const wrapperId = structureAPI.getPageWrapperComponentId(lightboxPageId, lightboxPageId)
			structureAPI.removeComponentFromDynamicStructure(wrapperId)
			structureAPI.removeComponentFromDynamicStructure('POPUPS_ROOT')
			lightboxExports.export({ lightboxPageId: undefined })
		},
	}
}

export const LightboxesAPI = withDependencies(
	[
		StructureAPI,
		named(MasterPageFeatureConfigSymbol, name),
		named(FeatureExportsSymbol, name),
		Props,
		PagesMapSymbol,
		ExperimentsSymbol,
	],
	lightboxesAPI
)
