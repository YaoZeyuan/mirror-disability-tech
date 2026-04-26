import { withDependencies } from '@wix/thunderbolt-ioc'
import { ResolvableReadyForScrollPromiseSymbol } from './symbols'
import type { IResolvableReadyForScrollPromise } from './types'
import type { IPageDidMountHandler, Experiments } from '@wix/thunderbolt-symbols'
import { ExperimentsSymbol } from '@wix/thunderbolt-symbols'

const createResolver = () => {
	let resolve: () => void
	const promise = new Promise<void>((res) => {
		resolve = res
	})
	return { promise, resolve: () => resolve() }
}

const ResolvableReadyForScrollPromise = withDependencies([], (): IResolvableReadyForScrollPromise => {
	const { promise, resolve } = createResolver()
	return {
		readyForScrollPromise: promise,
		setReadyForScroll: resolve,
	}
})

const ResolveReadyForScroll = withDependencies(
	[ResolvableReadyForScrollPromiseSymbol, ExperimentsSymbol],
	({ setReadyForScroll }: IResolvableReadyForScrollPromise, experiments: Experiments): IPageDidMountHandler => {
		return {
			pageDidMount: () => {
				setReadyForScroll()
				if (experiments['specs.thunderbolt.scrollToAnchorSsr']) {
					document.documentElement.style.removeProperty('scroll-padding-top')
				}
			},
		}
	}
)

export { ResolveReadyForScroll, ResolvableReadyForScrollPromise }
