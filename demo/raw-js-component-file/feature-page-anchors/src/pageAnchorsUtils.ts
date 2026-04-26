import fastdom from 'fastdom'
import { debounce } from 'lodash'
import type {
	ActiveAnchor,
	ActiveAnchorObserverComp,
	Anchor,
	AnchorClient,
	AnchorWithElement,
	PageAnchorsData,
	PageAnchorsObserverComp,
	PageConfigAnchor,
} from './types'
import type { BrowserWindow, IDomSelectors, IPropsStore } from '@wix/thunderbolt-symbols'
import {
	RESIZE_DEBOUNCE_WAIT,
	SCROLL_DEBOUNCE_WAIT,
	TOP_ANCHOR,
	TOP_ANCHOR_COMP_ID,
	TOP_ANCHOR_DATA_ID,
	WIX_ADS,
} from './constants'
import { getHeaderElement } from '@wix/thunderbolt-commons'

export const getAnchorsObserversPropsToUpdate = (
	browserWindow: BrowserWindow,
	pageAnchorsObservers: Array<PageAnchorsObserverComp>,
	activeAnchorObservers: Array<ActiveAnchorObserverComp>,
	activeAnchor: ActiveAnchor,
	anchorsWithElements: Array<AnchorWithElement>,
	pageId: string,
	shouldSetPageAnchors: boolean,
	domSelectors: IDomSelectors
) => {
	const propsToUpdate: {
		[compId: string]: { activeAnchor: ActiveAnchor; anchors?: Array<AnchorClient> }
	} = {}

	if (activeAnchorObservers.length) {
		activeAnchorObservers.forEach((comp: ActiveAnchorObserverComp) => {
			propsToUpdate[comp.id] = { activeAnchor }
		})
	}

	if (pageAnchorsObservers.length) {
		const reducedAnchors: Array<AnchorClient> = anchorsWithElements
			? anchorsWithElements.map((anchorWithElement) => ({
					compId: anchorWithElement.compId,
					dataId: anchorWithElement.dataId,
					name: anchorWithElement.name,
				}))
			: []
		pageAnchorsObservers.forEach((comp: PageAnchorsObserverComp) => {
			propsToUpdate[comp.id] = { activeAnchor }
			// Set anchors only to VerticalAnchorsMenu component, and only on init
			if (shouldSetPageAnchors) {
				const { pageTopLabel, hiddenAnchorIds } = comp.compData
				const pageHiddenAnchorIds: Array<string> =
					hiddenAnchorIds && hiddenAnchorIds.hasOwnProperty(pageId)
						? (hiddenAnchorIds as Record<string, Array<string>>)[pageId]
						: []
				const topAnchor: AnchorClient = {
					compId: TOP_ANCHOR_COMP_ID,
					dataId: TOP_ANCHOR_DATA_ID,
					name: pageTopLabel || '',
				}
				const _anchors = [topAnchor].concat(reducedAnchors).filter((anchor) => {
					const anchorCompId = anchor.compId
					const anchorElement = domSelectors.getByCompId(anchorCompId, browserWindow!.document)
					const isAnchorVisibleInDOM =
						anchorCompId === TOP_ANCHOR_COMP_ID ||
						Boolean(anchorElement && browserWindow!.getComputedStyle(anchorElement).display !== 'none')
					const isAnchorVisibleInData = !pageHiddenAnchorIds.includes(anchorCompId)

					return isAnchorVisibleInDOM && isAnchorVisibleInData
				})
				propsToUpdate[comp.id].anchors = _anchors.length ? _anchors : [topAnchor]
			}
		})
	}

	return propsToUpdate
}

const convertAnchorToActiveAnchor = (anchor: Anchor): ActiveAnchor => {
	return {
		compId: anchor.compId,
		dataId: anchor.dataId,
	}
}
export const getActiveAnchor = (anchors: Array<Anchor>, offset: number, browserWindow: BrowserWindow): ActiveAnchor => {
	const isBottomOfPage =
		browserWindow!.innerHeight + browserWindow!.scrollY >= browserWindow!.document.body.scrollHeight
	if (isBottomOfPage) {
		return anchors[anchors.length - 1]
	}

	const nextActiveAnchorIndex = anchors.findIndex((anchor: Anchor) => Math.floor(anchor.top - offset) > 0)

	if (nextActiveAnchorIndex === -1 && anchors[anchors.length - 1]) {
		// all anchors above viewport - return last anchor
		return convertAnchorToActiveAnchor(anchors[anchors.length - 1])
	}
	if (nextActiveAnchorIndex === 0 || !anchors[nextActiveAnchorIndex - 1]) {
		// active anchor is in the top of the page
		return TOP_ANCHOR
	}
	return convertAnchorToActiveAnchor(anchors[nextActiveAnchorIndex - 1])
}

export const createAnchorObserver = (
	pageAnchorsData: PageAnchorsData,
	browserWindow: BrowserWindow,
	propsStore: IPropsStore,
	domSelectors: IDomSelectors
) => {
	const { pageAnchorsObservers, activeAnchorObservers, anchors, pageId, siteOffset, headerCompId, reCheckAnchors } =
		pageAnchorsData
	const headerElement = getHeaderElement(headerCompId, browserWindow!)
	const headerHeight = headerElement?.getBoundingClientRect().height
	let anchorsWithElements: Array<AnchorWithElement>
	let offset = headerHeight ?? siteOffset

	const initAnchors = () => {
		// initialize the wix AD height for anchor calculation
		const wixAds = browserWindow!.document.getElementById(WIX_ADS)
		if (wixAds) {
			offset += wixAds.offsetHeight
		}
		// TODO - change this reduce to map once @guybs understands why some elements are missing from the DOM. For now we filter them out
		anchorsWithElements = anchors.reduce(
			(acc: Array<AnchorWithElement>, anchor: PageConfigAnchor): Array<AnchorWithElement> => {
				const element = domSelectors.getByCompId(anchor.compId, browserWindow!.document)
				if (element) {
					acc.push({
						...anchor,
						element,
						top: element.getBoundingClientRect().top || 0,
					})
				}
				return acc
			},
			[]
		)
		sortAnchors()
	}

	const getMeasuredAnchors = (): Array<AnchorWithElement> => {
		// in the editor anchors are added after we invoke the model update handler, so we need to find all elements on measurement
		if (reCheckAnchors && (!anchorsWithElements || anchors.length > anchorsWithElements.length)) {
			initAnchors()
		}
		return anchorsWithElements.map((anchorWithElement: AnchorWithElement) => ({
			...anchorWithElement,
			top: anchorWithElement.element.getBoundingClientRect().top || 0,
		}))
	}

	const setAnchors = (shouldSetPageAnchors: boolean) => {
		const activeAnchor = getActiveAnchor(anchorsWithElements, offset, browserWindow)

		if (activeAnchor) {
			propsStore.update(
				getAnchorsObserversPropsToUpdate(
					browserWindow,
					pageAnchorsObservers,
					activeAnchorObservers,
					activeAnchor,
					anchorsWithElements,
					pageId,
					shouldSetPageAnchors,
					domSelectors
				)
			)
		}
	}
	const sortAnchors = () => anchorsWithElements.sort((anchor1, anchor2) => anchor1.top - anchor2.top)

	const measureAnchors = (reSort: boolean) => {
		anchorsWithElements = getMeasuredAnchors()
		if (reSort) {
			sortAnchors()
		}
	}

	const calculateAnchors = (_reCheckAnchors: boolean) => {
		fastdom.measure(() => {
			measureAnchors(_reCheckAnchors)
			setAnchors(_reCheckAnchors)
		})
	}
	const pageAnchorsScrollListener = debounce(calculateAnchors.bind(null, reCheckAnchors), SCROLL_DEBOUNCE_WAIT)
	const pageAnchorsResizeListener = debounce(calculateAnchors.bind(null, true), RESIZE_DEBOUNCE_WAIT)

	return () => {
		fastdom.measure(() => {
			initAnchors()
			setAnchors(true)
		})
		browserWindow!.addEventListener('scroll', pageAnchorsScrollListener)
		browserWindow!.addEventListener('resize', pageAnchorsResizeListener)

		return () => {
			pageAnchorsScrollListener.cancel()
			pageAnchorsResizeListener.cancel()
			browserWindow!.removeEventListener('scroll', pageAnchorsScrollListener)
			browserWindow!.removeEventListener('resize', pageAnchorsResizeListener)
		}
	}
}
