import type { MotionEffectsReactions, TriggersAndReactionsPageConfig } from './types'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import { LoggerSymbol, PageFeatureConfigSymbol } from '@wix/thunderbolt-symbols'
import type { AnimationManager, IMotion } from 'feature-motion'
import { MotionSymbol } from 'feature-motion'
import { name as featureName } from './symbols'

export const motionEffectsReactions = withDependencies(
	[named(PageFeatureConfigSymbol, featureName), optional(MotionSymbol), LoggerSymbol],
	(featureConfig: TriggersAndReactionsPageConfig, motion: IMotion): MotionEffectsReactions => {
		let motionEffectsManager: AnimationManager | undefined

		if (featureConfig.isMotionEnabled && motion) {
			motionEffectsManager = motion.getManager()
		}

		const play: MotionEffectsReactions['play'] = (effectId, targetCompId) => {
			motionEffectsManager?.trigger({ play: [{ effectId, targetId: targetCompId }] })
		}

		const toggle: MotionEffectsReactions['toggle'] = (effectId, targetCompId, state) => {
			motionEffectsManager?.trigger({ play: [{ effectId, targetId: targetCompId, toggle: state }] })
		}

		const scrub: MotionEffectsReactions['scrub'] = (effectScrubMap, isBreakpointChange) => {
			motionEffectsManager?.trigger({ scrub: effectScrubMap }, isBreakpointChange)
		}

		return {
			play,
			toggle,
			scrub,
		}
	}
)
