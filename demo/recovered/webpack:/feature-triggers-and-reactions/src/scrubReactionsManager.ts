import type {
	MotionEffectsReactions,
	IScrubReactionManager,
	TriggersAndReactionsPageConfig,
	ScrubReactionWithBpRanges,
} from './types'
import { named, withDependencies } from '@wix/thunderbolt-ioc'
import { MotionEffectsReactionsSymbol, name } from './symbols'
import type { BrowserWindow } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol, PageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { ScrubTriggerVariant } from '@wix/thunderbolt-becky-types'
import { isSSR } from '@wix/thunderbolt-commons'
import { isTriggerBpRangeInCurrentWindowRange, getMatchMediaString } from './utils'

export const scrubReactionsManager = withDependencies(
	[named(PageFeatureConfigSymbol, name), BrowserWindowSymbol, MotionEffectsReactionsSymbol],
	(
		{ scrubReactionWithBpRanges, scrubBpRanges }: TriggersAndReactionsPageConfig,
		browserWindow: NonNullable<BrowserWindow>,
		motionEffectsReactions: MotionEffectsReactions
	): IScrubReactionManager => {
		const activeListeners: Array<MediaQueryList> = []
		let isHoverSupported = false

		const checkForHoverSupport = () => browserWindow.matchMedia('(hover: hover)').matches

		const triggerScrub = (isBreakpointChange?: boolean) => {
			const viewportWidth = browserWindow.innerWidth
			motionEffectsReactions.scrub(
				getEffectsCurrentBreakpoint(viewportWidth, scrubReactionWithBpRanges),
				isBreakpointChange
			)
		}

		const handleMediaQueryChange = (event: MediaQueryListEvent) => {
			if (event.matches) {
				triggerScrub(true)
			}
		}

		const getEffectsCurrentBreakpoint = (viewportWidth: number, data: ScrubReactionWithBpRanges) => {
			return data.reduce(
				(acc, reactionData) => {
					const isTriggerSupported = isHoverSupported || reactionData.triggerData.trigger !== 'pointer-move'
					if (!isTriggerSupported) {
						return acc
					}

					const isInBreakpoint = isTriggerBpRangeInCurrentWindowRange(reactionData.triggerBpRange, viewportWidth)
					if (isInBreakpoint) {
						reactionData.reactions.forEach((reaction) => {
							acc[reaction.reactionData.effect] = reactionData.triggerData as ScrubTriggerVariant
						})
					}
					return acc
				},
				{} as Record<string, ScrubTriggerVariant>
			)
		}

		const observeBreakpointChange = () => {
			let hasDefaultScope = false
			let hasMatch = false

			scrubBpRanges.forEach((range) => {
				const matchMediaString = getMatchMediaString(range)

				if (matchMediaString) {
					const mediaQueryList = browserWindow.matchMedia(matchMediaString)
					activeListeners.push(mediaQueryList)
					mediaQueryList.addEventListener('change', handleMediaQueryChange)

					if (mediaQueryList.matches) {
						hasMatch = true
						triggerScrub()
					}
				} else {
					hasDefaultScope = true
				}
			})

			if (!hasMatch && hasDefaultScope) {
				triggerScrub()
			}
		}

		const init = () => {
			if (isSSR(browserWindow)) {
				return
			}

			isHoverSupported = checkForHoverSupport()

			observeBreakpointChange()
		}

		const destroy = () => {
			if (isSSR(browserWindow)) {
				return
			}

			activeListeners.forEach((mediaQueryList) => {
				mediaQueryList.removeEventListener('change', handleMediaQueryChange)
			})

			activeListeners.length = 0
		}

		const observe: IScrubReactionManager['observe'] = ({ triggerData }) => {
			if (!isHoverSupported) {
				return
			}

			const triggerDataList = Object.values(triggerData)
				.flat()
				.filter((v) => !!v.triggerData) as ScrubReactionWithBpRanges

			const scrubMap = getEffectsCurrentBreakpoint(browserWindow.innerWidth, triggerDataList)

			motionEffectsReactions.scrub(scrubMap, false)
		}

		return {
			init,
			observe,
			destroy,
		}
	}
)
