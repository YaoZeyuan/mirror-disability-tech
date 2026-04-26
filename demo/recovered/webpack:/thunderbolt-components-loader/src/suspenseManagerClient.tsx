import { createPromise, isForwardRef } from '@wix/thunderbolt-commons'
import React, { Suspense, useEffect, useMemo } from 'react'
import type {
	ComponentModule,
	CreateSuspenseWrapperParams,
	WithDeferredHydrateOptionsCSR,
	WithDeferredHydrateWrapper,
} from './types'
import type { ILogger } from '@wix/thunderbolt-symbols'

export const EmptyDiv = ({
	logger,
	debugRendering,
	id,
	compClassType,
	height,
	shouldApplyId = false,
}: {
	logger?: ILogger
	debugRendering?: boolean
	id: any
	compClassType?: string
	height?: number
	shouldApplyId?: boolean
}) => {
	useEffect(() => {
		logger?.meter('react_render_error', {
			customParams: {
				compId: id,
				...(compClassType && { compClassType }),
				type: 'Suspense Fallback',
			},
		})
		const maybeCompClassType = compClassType ? ` - (${compClassType})` : ''
		console.error(`suspense rendered fallback for - ${id}${maybeCompClassType}`)
	}, [logger, debugRendering, id, compClassType])
	return <div {...(shouldApplyId && { id })} {...(height && { style: { height: `${height}px` } })} />
}

function wrapPromise(promise: Promise<any>) {
	let status = 'pending'
	let response: any

	const suspender = promise.then(
		(res: any) => {
			status = 'success'
			response = res
		},
		(err: any) => {
			status = 'error'
			response = err
		}
	)

	const read = () => {
		switch (status) {
			case 'pending':
				throw suspender
			case 'error':
				throw response
			default:
				return response
		}
	}

	return { read, status }
}

function SuspenseInnerDeferred(props: any) {
	const ReactComponent = props.api.read()
	if (props.debugRendering) {
		console.log(`rendering { compId: ${props.id}}`)
	}
	return props.children(ReactComponent)
}
// called once per comp type when the component is loaded to the store
export const WithHydrateWrapperCSR: WithDeferredHydrateWrapper<WithDeferredHydrateOptionsCSR> = ({
	deferredComponentLoaderFactory,
	debugRendering,
	setIsWaitingSuspense,
	logger,
	placeholderHeight,
}) => {
	// called for each render
	const ViewportHydrator = (props: any, ref: any) => {
		const suspender = useMemo(() => {
			const { promise, resolver } = createPromise<React.ComponentType<any> | (() => React.ReactNode)>()
			const api = wrapPromise(promise)
			return { api, resolver }
		}, [])

		useEffect(() => {
			setIsWaitingSuspense(props.id, true)
			const { componentPromise, onUnmount } = deferredComponentLoaderFactory!(props.id, props.children)
			componentPromise.then((...args) => {
				setIsWaitingSuspense(props.id, false)
				suspender.resolver(...args)
			})
			return () => onUnmount && onUnmount()
		}, [props.id, suspender, suspender.resolver, props.children])

		return (
			<Suspense
				fallback={
					<EmptyDiv
						height={placeholderHeight}
						logger={logger}
						debugRendering={debugRendering}
						id={props.id}
						shouldApplyId={true}
					/>
				}
			>
				<SuspenseInnerDeferred api={suspender.api} debugRendering={debugRendering} id={props.id}>
					{(Comp: React.ComponentType<any>) => <Comp {...props} ref={isForwardRef(Comp) ? ref : null} />}
				</SuspenseInnerDeferred>
			</Suspense>
		)
	}

	return React.forwardRef(ViewportHydrator)
}

const LazyCompInner = ({
	setIsWaitingSuspense,
	...props
}: {
	setIsWaitingSuspense: CreateSuspenseWrapperParams['setIsWaitingSuspense']
	id: string
}) => {
	useEffect(() => {
		setIsWaitingSuspense(props.id, false)
	}, [props.id, setIsWaitingSuspense])
	return <></>
}

const createLazyComponent = ({ loadComponentModule }: { loadComponentModule: () => Promise<ComponentModule<any>> }) => {
	const idPromise = createPromise<string>()
	return {
		// React.lazy cannot be called within a component render, even if it is wrapped with useMemo it will be called on each render.
		// This is why we need to create the lazy component outside of the component render and pass the id when it's ready.
		LazyComp: React.lazy(() =>
			loadComponentModule().then(async (module) => {
				if (module.waitForLoadableReady) {
					const compId = await idPromise.promise
					await module.waitForLoadableReady(compId)
				}
				return { default: module.component }
			})
		),
		resolveId: idPromise.resolver,
	}
}

export const createSuspenseWrapper = ({
	loadComponentModule,
	setIsWaitingSuspense,
	getIsWaitingSuspense,
	logger,
	debugRendering,
}: CreateSuspenseWrapperParams) => {
	const { LazyComp, resolveId } = createLazyComponent({ loadComponentModule })
	return (props: any) => {
		resolveId(props.id)
		useEffect(() => {
			// In case the LazyComp was already loaded, LazyCompInner useEffect will run before
			if (getIsWaitingSuspense(props.id) === false) {
				return
			}
			setIsWaitingSuspense(props.id, true)
		}, [props.id])

		return (
			<Suspense
				fallback={
					<EmptyDiv id={props.id} compClassType={props.compClassType} logger={logger} debugRendering={debugRendering} />
				}
			>
				<LazyCompInner setIsWaitingSuspense={setIsWaitingSuspense} {...props} />
				<LazyComp {...props} />
			</Suspense>
		)
	}
}

export const createSsrSuspenseWrapper = async ({
	loadComponentModule,
	logger,
	debugRendering,
}: CreateSuspenseWrapperParams) => {
	const Comp = (await loadComponentModule()).component

	return (props: any) => (
		<Suspense
			fallback={
				<EmptyDiv id={props.id} compClassType={props.compClassType} logger={logger} debugRendering={debugRendering} />
			}
		>
			<Comp {...props} />
		</Suspense>
	)
}
