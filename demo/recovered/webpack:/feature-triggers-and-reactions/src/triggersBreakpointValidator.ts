import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ReactionsInBpRange } from '@wix/thunderbolt-becky-types'
import type { ITriggersBreakpointValidator } from './types'
import { isTriggerBpRangeInCurrentWindowRange } from './utils'

const triggersBreakpointValidatorFactory = (): ITriggersBreakpointValidator => {
	return {
		isTriggerBpRangeInCurrentBreakpoint: (reactionsInBpRange: ReactionsInBpRange) => {
			return isTriggerBpRangeInCurrentWindowRange(reactionsInBpRange.triggerBpRange)
		},
	}
}

export const triggersBreakpointValidator = withDependencies([], triggersBreakpointValidatorFactory)
