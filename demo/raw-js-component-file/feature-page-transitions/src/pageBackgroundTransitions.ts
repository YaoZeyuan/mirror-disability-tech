import { withDependencies, named } from '@wix/thunderbolt-ioc'
import type { IPropsStore, IStructureAPI, Experiments } from '@wix/thunderbolt-symbols'
import {
	FeatureStateSymbol,
	Props,
	contextIdSymbol,
	pageIdSym,
	PageFeatureConfigSymbol,
	StructureAPI,
	ExperimentsSymbol,
} from '@wix/thunderbolt-symbols'
import type {
	PageTransitionsPageConfig,
	PageTransitionsPageState,
	CompareDataDeep,
	HaveEqualBackgrounds,
} from './types'
import { name } from './symbols'
import type { ComponentWillMount, ViewerComponent } from 'feature-components'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { FillLayersProps } from '@wix/thunderbolt-becky-types'
import _ from 'lodash'
import { getPageBackgroundId } from '@wix/thunderbolt-commons'

const FILL_LAYERS_PROP_FIELDS_TO_COMPARE = [
	'video.videoInfo.videoId',
	'image.uri',
	'image.link.href',
	'image.displayMode',
	'backgroundImage.uri',
	'backgroundImage.link.href',
	'backgroundImage.displayMode',
]

const PROPS_TO_COMPARE = [
	'type',
	'alignType',
	'fittingType',
	'scrollType',
	'colorOverlay',
	'colorOverlayOpacity',
	'color',
	'opacity',
]

const compareDataDeep: CompareDataDeep = (prevData, currentData, refKeys, propsToCheck) => {
	// @ts-ignore
	const equal = propsToCheck.every((key: string) => (prevData && prevData[key]) === (currentData && currentData[key]))
	return (
		equal &&
		refKeys.every((ref: string) =>
			prevData || currentData
				? // @ts-ignore
					compareDataDeep(prevData && prevData[ref], currentData && currentData[ref], refKeys, propsToCheck)
				: true
		)
	)
}

const haveEqualBackgroundsData: HaveEqualBackgrounds = (currentPageBackground, prevPageBackground) => {
	if (!prevPageBackground || !currentPageBackground) {
		return false
	}

	// prev page background media data
	const prevMediaData = prevPageBackground.mediaRef
	const prevMediaDataType = prevMediaData && prevMediaData.type
	// current page background media data
	const currentMediaData = currentPageBackground.mediaRef
	const currentMediaDataType = currentMediaData && currentMediaData.type

	const isOnlyColor = !prevMediaData && !currentMediaData
	const isMediaTypeEqual = isOnlyColor || prevMediaDataType === currentMediaDataType
	const shouldIgnoreColor = prevMediaDataType === 'WixVideo' && isMediaTypeEqual

	const refKeys = ['mediaRef', 'imageOverlay']
	let propsToCheck = [...PROPS_TO_COMPARE]
	if (shouldIgnoreColor) {
		const colorIndex = propsToCheck.indexOf('color')
		propsToCheck.splice(colorIndex, 1)
	} else if (isOnlyColor) {
		propsToCheck = ['color']
	}

	return isMediaTypeEqual && compareDataDeep(prevPageBackground, currentPageBackground, refKeys, propsToCheck)
}

const haveEqualBackgrounds = (currentPageBackground: FillLayersProps, prevPageBackground: FillLayersProps): boolean => {
	if (!prevPageBackground || !currentPageBackground) {
		return false
	}
	return FILL_LAYERS_PROP_FIELDS_TO_COMPARE.every(
		(path) => _.get(prevPageBackground, path) === _.get(currentPageBackground, path)
	)
}

export const PageBackgroundComponentTransitionsWillMount = withDependencies(
	[
		named(PageFeatureConfigSymbol, name),
		Props,
		named(FeatureStateSymbol, name),
		pageIdSym,
		contextIdSymbol,
		StructureAPI,
		ExperimentsSymbol,
	],
	(
		pageConfig: PageTransitionsPageConfig,
		propsStore: IPropsStore,
		featureState: IFeatureState<PageTransitionsPageState>,
		pageId: string,
		contextId: string,
		structureApi: IStructureAPI,
		experiments: Experiments
	): ComponentWillMount<ViewerComponent> => {
		const pageBackgroundCompId = getPageBackgroundId(pageId)

		const updatePageBackground = (nextBg: FillLayersProps, hasBackgroundChanged: boolean) => {
			featureState.update((currentState) => ({
				...currentState,
				pageBackgroundProp: nextBg,
				pageBackground: pageConfig.pageBackground,
			}))
			const isPageTransitionsHandlerExperimentOn = experiments['specs.thunderbolt.pageBGTransitionHandler']

			const lastRenderedPageBgId = featureState.get()?.lastRenderedPageBgId
			const isLastRenderedPageBackgroundInStructure = !lastRenderedPageBgId || structureApi.get(lastRenderedPageBgId)

			const nextTransitionEnabled = featureState.get()?.nextTransitionEnabled ?? true

			const hasTransitionConditions = nextTransitionEnabled && hasBackgroundChanged

			let transitionEnabled: boolean

			if (isPageTransitionsHandlerExperimentOn) {
				// Experiment ON: Enable transitions for standard conditions OR editor-specific conditions
				// https://wix.atlassian.net/browse/TB-11457 Handle edge-case where the last rendered pageBackground's page was deleted and now it's
				// not in the structure anymore - resulting in PageBackground turning into a dead comp
				const isEditorWithoutPreview = pageConfig.isEditor && !pageConfig.isPreview
				const shouldEnableInEditor = isEditorWithoutPreview && !isLastRenderedPageBackgroundInStructure

				transitionEnabled = hasTransitionConditions || shouldEnableInEditor
			} else {
				// Experiment OFF: Enable transitions for standard conditions OR when not in structure
				transitionEnabled = hasTransitionConditions || !isLastRenderedPageBackgroundInStructure
			}

			if (transitionEnabled) {
				featureState.update((currentState) => ({
					...currentState,
					lastRenderedPageBgId: pageBackgroundCompId,
				}))
			}

			propsStore.update({
				BACKGROUND_GROUP: {
					key: `BACKGROUND_GROUP_${pageConfig.viewMode}`,
					transitionEnabled,
					className: `backgroundGroup_${pageId}`,
				},
			})
		}

		const hasBackgroundChanged = (nextBg: FillLayersProps) => {
			const state = featureState.get()
			const prevBg = state?.pageBackgroundProp

			const pageBackgroundData = pageConfig.pageBackground
			const prevBackgroundData = state?.pageBackground

			const pageUnderlayColorChanged = !haveEqualBackgroundsData(pageBackgroundData, prevBackgroundData)
			return !haveEqualBackgrounds(nextBg, prevBg) || pageUnderlayColorChanged
		}

		if (propsStore.get(pageBackgroundCompId)) {
			const nextBg = propsStore.get(pageBackgroundCompId).fillLayers
			const hasBgChanged = hasBackgroundChanged(nextBg)
			updatePageBackground(nextBg, hasBgChanged)
		}

		const unsubscribeFromPropChanges = propsStore.subscribeToChanges((changes) => {
			if (pageBackgroundCompId in changes) {
				const nextBg: FillLayersProps = changes[pageBackgroundCompId]?.fillLayers
				const backgroundChanged = hasBackgroundChanged(nextBg)

				if (backgroundChanged) {
					updatePageBackground(nextBg, true)
				}
			}
		})

		featureState.update((currentState) => {
			const propsUpdateListenersUnsubscribers = currentState?.propsUpdateListenersUnsubscribers ?? {}
			propsUpdateListenersUnsubscribers[contextId] = unsubscribeFromPropChanges
			return {
				...(currentState || {}),
				propsUpdateListenersUnsubscribers,
			}
		})

		return {
			componentTypes: ['PageBackground'],
			componentWillMount() {
				const state = featureState.get()
				const isFirstMount = state?.isFirstMount ?? true

				featureState.update(() => ({
					...state,
					isFirstMount,
				}))
			},
		}
	}
)
