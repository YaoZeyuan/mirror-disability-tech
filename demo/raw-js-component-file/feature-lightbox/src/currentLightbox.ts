import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ICurrentLightbox } from './types'

export const CurrentLightbox = withDependencies(
	[],
	(): ICurrentLightbox => ({
		isDuringReopen: () => false,
	})
)
