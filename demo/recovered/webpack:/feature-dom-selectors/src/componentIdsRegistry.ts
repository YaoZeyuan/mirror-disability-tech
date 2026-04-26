import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IComponentIdsRegistry } from './types'

export const ComponentIdsRegistry = withDependencies([] as const, (): IComponentIdsRegistry => {
	const componentIds = new Set<string>()

	return {
		add: (id: string) => componentIds.add(id),
		getAll: () => componentIds,
	}
})
