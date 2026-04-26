import type { CompProps, IDomSelectors } from '@wix/thunderbolt-symbols'
import fastdom from 'fastdom'

const isHorizontalScrollOverflow = (element: Element) => {
	const boundingRect = element.getBoundingClientRect()
	const horizontalOverflow = element.scrollWidth - boundingRect.width
	const verticalOverflow = element.scrollHeight - boundingRect.height

	return horizontalOverflow > verticalOverflow
}

const getCurrentScrollPosition = (element: Element, isHorizontalLayout: boolean) =>
	isHorizontalLayout ? element.scrollLeft : element.scrollTop

const getScrollPortion = (element: Element, isHorizontalLayout: boolean) => {
	const boundingRect = element.getBoundingClientRect()
	return isHorizontalLayout ? boundingRect.width : boundingRect.height
}

const getTotalScrollSpace = (element: Element, isHorizontalLayout: boolean) =>
	isHorizontalLayout ? element.scrollWidth : element.scrollHeight

/**
 * Returns the min and max scroll positions of the element by scrolling to start / end
 * saving the values as limits from both ends
 * these values will help identify if the scroll position is at the start / end and should perform a loop scroll
 * This technique helps overcome margin and scroll snap calculation issues on edges
 */
const getScrollLimits = (element: Element, totalScrollSpace: number, isHorizontalLayout: boolean) => {
	const scrollAxis = isHorizontalLayout ? 'left' : 'top'
	const initScrollPosition = getCurrentScrollPosition(element, isHorizontalLayout)

	// scroll to end to retrieve max scroll limit
	element.scrollTo({
		[scrollAxis]: totalScrollSpace,
		// @ts-expect-error accidentally removed from type https://github.com/w3c/csswg-drafts/pull/8107
		behavior: 'instant',
	})
	const maxScrollPosition = getCurrentScrollPosition(element, isHorizontalLayout)

	// scroll to beginning to retrieve  min scroll limit
	element.scrollTo({
		[scrollAxis]: 0,
		// @ts-expect-error accidentally removed from type https://github.com/w3c/csswg-drafts/pull/8107
		behavior: 'instant',
	})
	const minScrollPosition = getCurrentScrollPosition(element, isHorizontalLayout)

	// restore to initial scroll position if user scrolled manually before click forward/backward buttons
	element.scrollTo({
		[scrollAxis]: initScrollPosition,
		// @ts-expect-error accidentally removed from type https://github.com/w3c/csswg-drafts/pull/8107
		behavior: 'instant',
	})

	return {
		minScrollPosition,
		maxScrollPosition,
	}
}

// when reaching max scroll position and scrolling forward, return to the beginning
const shouldScrollToBeginning = (currentScrollPosition: number, maxScrollPosition: number, scrollDirection: string) => {
	return currentScrollPosition >= maxScrollPosition && scrollDirection === 'forward'
}

export const getNewScrollPosition = (
	element: Element,
	scrollDirection: string,
	isHorizontalLayout: boolean,
	dontTruncateScrollPositionExperiment: boolean = false
) => {
	const currentScrollPosition = getCurrentScrollPosition(element, isHorizontalLayout)
	const totalScrollSpace = getTotalScrollSpace(element, isHorizontalLayout)
	const scrollPortion = getScrollPortion(element, isHorizontalLayout)
	const scrollDirectionFactor = scrollDirection === 'forward' ? 1 : -1
	const { minScrollPosition, maxScrollPosition } = getScrollLimits(element, totalScrollSpace, isHorizontalLayout)

	// when reaching min scroll position and scrolling backward, return to the end
	if (Math.trunc(currentScrollPosition) <= minScrollPosition && scrollDirection === 'backward') {
		return totalScrollSpace
	}

	if (
		dontTruncateScrollPositionExperiment &&
		shouldScrollToBeginning(currentScrollPosition, maxScrollPosition, scrollDirection)
	) {
		return 0
	} else if (shouldScrollToBeginning(Math.trunc(currentScrollPosition), maxScrollPosition, scrollDirection)) {
		return 0
	}

	const nextScrollPosition = currentScrollPosition + scrollDirectionFactor * scrollPortion
	if (nextScrollPosition + scrollPortion > totalScrollSpace) {
		return totalScrollSpace
	}

	if (nextScrollPosition < 0) {
		return 0
	}

	// round to avoid non-deterministic heuristic of how browser decides to scroll
	// when supplied a fraction scroll position
	return Math.round(nextScrollPosition)
}

export const scrollInnerContent = (
	containerProps: CompProps,
	containerId: string,
	scrollDirection: 'forward' | 'backward',
	domSelectors: IDomSelectors,
	dontTruncateScrollPositionExperiment: boolean = false
) => {
	const overflowWrapperCssClass =
		containerProps.containerProps?.overlowWrapperClassName ||
		containerProps.responsiveContainerProps?.overlowWrapperClassName // yep, very coupled how different containers decided to name this prop
	if (!overflowWrapperCssClass) {
		return
	}

	const containerElement = domSelectors.getByCompId(containerId)
	const overflowWrapperElement = containerElement!.getElementsByClassName(overflowWrapperCssClass)[0]

	fastdom.measure(() => {
		const isHorizontalLayout = isHorizontalScrollOverflow(overflowWrapperElement)
		const newScrollPosition = getNewScrollPosition(
			overflowWrapperElement,
			scrollDirection,
			isHorizontalLayout,
			dontTruncateScrollPositionExperiment
		)

		fastdom.mutate(() => {
			overflowWrapperElement.scrollTo({
				[isHorizontalLayout ? 'left' : 'top']: newScrollPosition,
				behavior: 'smooth',
			})
		})
	})
}
