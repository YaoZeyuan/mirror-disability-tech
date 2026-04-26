import { withDependencies } from '@wix/thunderbolt-ioc'
import { createPromise } from '@wix/thunderbolt-commons'
import type { IAppDidMountService } from './types'
import { AppDidMountServiceSymbol } from './symbols'

export const AppDidMountService = withDependencies([], (): IAppDidMountService => {
	const { resolver, promise } = createPromise<void>()

	return {
		getPromise: () => promise,
		resolve: () => {
			resolver()
		},
	}
})

export const AppDidMountPromise = withDependencies(
	[AppDidMountServiceSymbol],
	(appDidMountService: IAppDidMountService) => {
		return appDidMountService.getPromise()
	}
)
