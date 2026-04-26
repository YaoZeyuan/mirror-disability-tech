import type { IPropsStore } from '@wix/thunderbolt-symbols'
import { getDisplayedId, getFullId, getFullItemId } from '@wix/thunderbolt-commons'
import type { TriggersAndReactionsPageConfig } from './types'
import type { ReactionsInBpRange, ViewportTriggerParams } from '@wix/thunderbolt-becky-types'

export const getReactionTargetComps = (
	originalTarget: string,
	srcCompId: string,
	repeaterDescendantToRepeaterMapper: TriggersAndReactionsPageConfig['repeaterDescendantToRepeaterMapper'],
	propsStore: IPropsStore
) => {
	const targetRepeaterParent = repeaterDescendantToRepeaterMapper[originalTarget]
	// if target is repeater child - template component
	if (targetRepeaterParent) {
		// if the trigger not from the same repeater add reaction to all items
		if (targetRepeaterParent !== repeaterDescendantToRepeaterMapper[getFullId(srcCompId)]) {
			const { items = [] } = propsStore.get(repeaterDescendantToRepeaterMapper[originalTarget])
			return items.map((item: string) => getDisplayedId(originalTarget, item))
		} else {
			return [getDisplayedId(originalTarget, getFullItemId(srcCompId))]
		}
	} else {
		return [originalTarget]
	}
}

export const hasAncestorWithId = (element: EventTarget | null, id: string): boolean => {
	if (!element) {
		return false
	}
	const htmlElement = element as HTMLElement
	if (htmlElement.id === id) {
		return true
	}
	return !!htmlElement.parentNode && hasAncestorWithId(htmlElement.parentNode, id)
}

export const isTriggerBpRangeInCurrentWindowRange = (
	condition: ReactionsInBpRange['triggerBpRange'],
	viewportWidth?: number
) => {
	viewportWidth = viewportWidth || window.innerWidth
	if (condition.min && viewportWidth < condition.min) {
		return false
	}
	if (condition.max && viewportWidth > condition.max) {
		return false
	}
	return true
}

export const stringifyOptions = ({
	threshold,
	margin: { top, bottom, left, right },
}: Required<ViewportTriggerParams>) =>
	`${threshold}_${top.value}${top.type}_${right.value}${right.type}_${bottom.value}${bottom.type}_${left.value}${left.type}`

export const getMatchMediaString = (range: { min?: number; max?: number }): string => {
	const mediaString = [] as Array<string>

	if (range.max) {
		mediaString.push(`(max-width:${range!.max}px)`)
	}
	if (range.min) {
		mediaString.push(`(min-width:${range!.min}px)`)
	}

	return mediaString.join(' and ')
}

export const observeBreakpointChange = (
	breakpointRangesList: Array<{ min?: number; max?: number }>,
	activeListeners: Array<MediaQueryList>,
	handleMediaQueryChange: () => void,
	initObservers: () => void
) => {
	// Track if we have a default breakpoint range (one without min/max constraints)
	let hasDefaultScope = false
	// Track if any specific breakpoint range matches current viewport
	let hasMatch = false

	breakpointRangesList.forEach((range) => {
		// Convert breakpoint range to media query string (e.g. "(min-width: 768px) and (max-width: 1024px)")
		const matchMediaString = getMatchMediaString(range)

		if (matchMediaString) {
			// Create and setup media query listener for this breakpoint range
			const mediaQueryList = window.matchMedia(matchMediaString)
			activeListeners.push(mediaQueryList)
			mediaQueryList.addEventListener('change', handleMediaQueryChange)

			// Check if this breakpoint range matches current viewport
			if (mediaQueryList.matches) {
				hasMatch = true
			}
		} else {
			// This range has no constraints - it's our default scope
			hasDefaultScope = true
		}
	})

	// Initialize viewport observers if:
	// 1. No specific breakpoint range matches current viewport
	// 2. We have a default scope to fall back to
	if (!hasMatch && hasDefaultScope) {
		initObservers()
	}
}

export const destroyBreakpointChange = (activeListeners: Array<MediaQueryList>, handleMediaQueryChange: () => void) => {
	activeListeners.forEach((mediaQueryList) => {
		mediaQueryList.removeEventListener('change', handleMediaQueryChange)
	})
	activeListeners.length = 0
}
