import type { ContainerModuleLoader } from '@wix/thunderbolt-ioc'
import { ComponentWillMountSymbol } from 'feature-components'

import { MpaNavigationSymbol, AudioPlaybackStateSymbol } from './symbols'
import { MpaNavigation } from './mpaNavigation'
import { AudioPlaybackState } from './audioPlaybackState'
import { AudioPlayerWillMount } from './audioPlayerWillMount'

export type { IMpaNavigation } from './types'
export { isSameUrlExceptQuery } from './utils'

export const site: ContainerModuleLoader = (bind) => {
	bind(MpaNavigationSymbol).to(MpaNavigation)
	bind(AudioPlaybackStateSymbol).to(AudioPlaybackState)
}

export const page: ContainerModuleLoader = (bind) => {
	bind(ComponentWillMountSymbol).to(AudioPlayerWillMount)
}

export { MpaNavigationSymbol }
