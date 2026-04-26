import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IAudioPlaybackState } from './types'

export const AudioPlaybackState = withDependencies([], (): IAudioPlaybackState => {
	let hasPlayed = false
	return {
		hasEverPlayed: () => hasPlayed,
		markPlayed: () => {
			hasPlayed = true
		},
	}
})
