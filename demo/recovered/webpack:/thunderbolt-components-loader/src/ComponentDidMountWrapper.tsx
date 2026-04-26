import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ICompsLifeCycle } from '@wix/thunderbolt-symbols'
import { CompsLifeCycleSym } from '@wix/thunderbolt-symbols'
import type { IWrapComponent } from './types'
import React, { useEffect } from 'react'
import { isForwardRef } from 'react-is'

export const ComponentDidMountWrapper = withDependencies(
	[CompsLifeCycleSym],
	(compsLifeCycle: ICompsLifeCycle): IWrapComponent => {
		return {
			wrapComponent: <T extends { id: string; compId?: string }>(
				Component: React.ComponentType<React.PropsWithoutRef<T> | Omit<React.PropsWithoutRef<T>, 'compId'>>
			) => {
				const Wrapper: React.ForwardRefRenderFunction<React.ForwardedRef<any>, React.PropsWithoutRef<T>> = (
					props,
					ref
				) => {
					const { compId, id } = props
					useEffect(() => {
						compsLifeCycle.notifyCompDidMount(compId ?? id, id) // we call it when the id\displayed id changes although it's not mount
						return () => {
							compsLifeCycle.componentDidUnmount(compId ?? id, id)
						}
					}, [compId, id])
					const compWithProps = <Component ref={null} {...props} />
					return (
						<Component {...props} ref={isForwardRef(compWithProps) && ref && typeof ref === 'function' ? ref : null} />
					)
				}
				return React.forwardRef<any, T>(Wrapper)
			},
		}
	}
)
