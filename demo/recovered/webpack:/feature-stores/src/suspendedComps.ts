import type { IRendererPropsExtender, SuspendedCompsAPI } from '@wix/thunderbolt-symbols'

import { withDependencies } from '@wix/thunderbolt-ioc'

export const SuspendedComps = withDependencies([], (): SuspendedCompsAPI & IRendererPropsExtender => {
	const suspendedCompsStore: { [compId: string]: boolean } = {}
	const apis: SuspendedCompsAPI = {
		setIsWaitingSuspense: (compId, isWaitingSuspense) => {
			suspendedCompsStore[compId] = isWaitingSuspense
		},
		getIsWaitingSuspense: (compId) => suspendedCompsStore[compId],
	}
	return {
		...apis,
		extendRendererProps: async () => apis,
	}
})
