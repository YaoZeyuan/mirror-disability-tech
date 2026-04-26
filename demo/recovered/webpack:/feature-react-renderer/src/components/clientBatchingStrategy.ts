import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IStructureStore, BatchingStrategy, IAppDidMountHandler } from '@wix/thunderbolt-symbols'
import { Structure } from '@wix/thunderbolt-symbols'
import type { INavigationManager } from 'feature-navigation-manager'
import { NavigationManagerSymbol } from 'feature-navigation-manager'
import { createBatchingStrategy } from './batchingStrategy'
import ReactDOM from 'react-dom'

export const ClientBatchingStrategy = withDependencies<BatchingStrategy & IAppDidMountHandler>(
	[Structure, NavigationManagerSymbol],
	(structureStore: IStructureStore, navigationManager: INavigationManager) => {
		let fns = [] as Array<() => void>
		let finishRenderFirstPage = false
		const batchingStartegy = createBatchingStrategy((fn) => {
			if (navigationManager.shouldBlockRender() && finishRenderFirstPage) {
				fns.push(fn)
				return
			}
			if (fns.length) {
				const localFns = [...fns, fn]
				fns = []
				ReactDOM.unstable_batchedUpdates(() => {
					localFns.forEach((deferredFunc) => deferredFunc())
				})
			} else {
				ReactDOM.unstable_batchedUpdates(fn)
			}
		})
		return {
			...batchingStartegy,
			appDidMount: () => {
				finishRenderFirstPage = true
			},
		}
	}
)
