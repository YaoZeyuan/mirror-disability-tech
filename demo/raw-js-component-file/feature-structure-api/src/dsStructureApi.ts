import type { IStructureStore, IBaseStructureAPI, IStructureAPI } from '@wix/thunderbolt-symbols'
import { Structure, EditorFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { BaseStructureAPISym, name } from './symbols'
import type { StructureApiEditorConfig } from './types'
import { getPageBackgroundId } from '@wix/thunderbolt-commons'
import { shouldExcludeSkipToContentBtn } from './utils'

export const DsStructureAPI = withDependencies(
	[Structure, BaseStructureAPISym, named(EditorFeatureConfigSymbol, name)],
	(
		structureStore: IStructureStore,
		baseStructureAPI: IBaseStructureAPI,
		structureApiEditorConfig: StructureApiEditorConfig
	): IStructureAPI => {
		return {
			...baseStructureAPI,
			addPageAndRootToRenderedTree: (
				pageId: string,
				contextId: string,
				isLandingPage: boolean,
				isResponsive: boolean
			) => {
				const sitePages = structureStore.get('SITE_PAGES')
				const wrapperId = baseStructureAPI.getPageWrapperComponentId(pageId, contextId)
				const pageBgId = getPageBackgroundId(pageId)
				const hasPageBackground = structureStore.get(pageBgId)
				const mainMF = structureStore.get('main_MF')
				const rootComponents = [
					'FONT_FACES',
					'SCROLL_TO_TOP',
					'site-root',
					'DYNAMIC_STRUCTURE_CONTAINER',
					'SCROLL_TO_BOTTOM',
					'FONTS',
					'BYOC_STYLES',
					'SITE_STYLES',
					'CUSTOM_CSS',
					'StylableOverrides',
				]

				if (hasPageBackground) {
					rootComponents.splice(1, 0, 'BACKGROUND_GROUP')
				}

				if (structureApiEditorConfig.isPreview && structureStore.get('SKIP_TO_CONTENT_BTN')) {
					if (!shouldExcludeSkipToContentBtn(pageId, isLandingPage, isResponsive, structureStore)) {
						rootComponents.splice(2, 0, 'SKIP_TO_CONTENT_BTN')
					}
				}
				structureStore.update({
					main_MF: {
						...mainMF,
						components: rootComponents,
					},
					SITE_PAGES: {
						...sitePages,
						components: [wrapperId],
					},
					[wrapperId]: { componentType: 'PageMountUnmount', components: [pageId] },
					...(hasPageBackground && {
						BACKGROUND_GROUP: {
							componentType: 'BackgroundGroup',
							components: [pageBgId],
						},
					}),
				})
			},
			addShellStructure: async () => Promise.resolve(),
		}
	}
)
