import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ComponentWillMount, ViewerComponent } from 'feature-components'
import type { IAudioPlaybackState } from './types'
import { AudioPlaybackStateSymbol } from './symbols'

export const AudioPlayerWillMount = withDependencies(
	[AudioPlaybackStateSymbol],
	(audioPlaybackState: IAudioPlaybackState): ComponentWillMount<ViewerComponent> => ({
		componentTypes: ['MusicPlayer', 'SingleAudioPlayer'],
		componentWillMount: (comp) => {
			const existingOnPlay = (comp.getProps() as Record<string, any>)?.onPlay
			comp.updateProps({
				onPlay: (...args: Array<unknown>) => {
					existingOnPlay?.(...args)
					audioPlaybackState.markPlayed()
				},
			})
		},
	})
)
