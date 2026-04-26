import type { MasterPageClassNames } from '@wix/thunderbolt-components'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageWillMountHandler, IPropsStore, IPageWillUnmountHandler } from '@wix/thunderbolt-symbols'
import { Props, PageFeatureConfigSymbol, pageIdSym } from '@wix/thunderbolt-symbols'
import { LandingPageAPISymbol, name } from './symbols'
import type { LandingPagePageConfig, ILandingPagePageAPI } from './types'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'

const LANDING_PAGE_CLASS_NAME = 'landingPage'

const landingPageAPI: (propsStore: IPropsStore) => ILandingPagePageAPI = (propsStore) => {
	const getMasterPageClassNames = (): MasterPageClassNames => {
		const masterPageProps = propsStore.get('masterPage') || {}
		return masterPageProps.classNames || {}
	}

	const updateClassNames = (classNames: MasterPageClassNames) => {
		propsStore.update({
			masterPage: { classNames },
		})
	}

	const removeLandingPageClassName = (classNames: MasterPageClassNames) => {
		const clonedClassNames = { ...classNames }
		delete clonedClassNames[LANDING_PAGE_CLASS_NAME]
		return clonedClassNames
	}

	return {
		async updateClassNamesOnPageWillMount(isLandingPage) {
			const currentClassNames = getMasterPageClassNames()

			if (isLandingPage && !currentClassNames[LANDING_PAGE_CLASS_NAME]) {
				const classNames = { ...currentClassNames, [LANDING_PAGE_CLASS_NAME]: LANDING_PAGE_CLASS_NAME }
				updateClassNames(classNames)
			}

			if (!isLandingPage && currentClassNames[LANDING_PAGE_CLASS_NAME]) {
				const updatedClassNames = removeLandingPageClassName(currentClassNames)
				updateClassNames(updatedClassNames)
			}
		},
		async updateClassNamesOnPageWillUnMount(isLandingPage) {
			const currentClassNames = getMasterPageClassNames()

			if (isLandingPage && currentClassNames[LANDING_PAGE_CLASS_NAME]) {
				const updatedClassNames = removeLandingPageClassName(currentClassNames)
				updateClassNames(updatedClassNames)
			}
		},
	}
}

export const LandingPageAPI = withDependencies([Props], landingPageAPI)

export const LandingPage = withDependencies(
	[named(PageFeatureConfigSymbol, name), LandingPageAPISymbol, pageIdSym, optional(LightboxUtilsSymbol)],
	(
		config: LandingPagePageConfig,
		{ updateClassNamesOnPageWillMount, updateClassNamesOnPageWillUnMount }: ILandingPagePageAPI,
		pageId: string,
		popupUtils?: ILightboxUtils
	): IPageWillMountHandler & IPageWillUnmountHandler => {
		const { isLandingPage } = config
		const shouldSkipUpdatingClassName = pageId === 'masterPage' || popupUtils?.isLightbox(pageId) // This is for Editor flow

		return {
			name: 'landingPage',
			pageWillMount: () => {
				if (shouldSkipUpdatingClassName) {
					return
				}

				updateClassNamesOnPageWillMount(isLandingPage)
			},
			pageWillUnmount: () => {
				if (shouldSkipUpdatingClassName) {
					return
				}

				updateClassNamesOnPageWillUnMount(isLandingPage)
			},
		}
	}
)
