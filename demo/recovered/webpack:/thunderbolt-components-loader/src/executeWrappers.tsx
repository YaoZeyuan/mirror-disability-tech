import type { ComponentType } from 'react'
import React from 'react'
import { multi, withDependencies } from '@wix/thunderbolt-ioc'
import type { ComponentModule, IWrapComponent } from './types'
import { ComponentWrapperSymbol } from './symbols'
import _ from 'lodash'

export const ExecuteComponentWrappers = withDependencies(
	[multi(ComponentWrapperSymbol)] as const,
	(componentWrappers: Array<IWrapComponent>) => {
		function removeCompIdWrapper(Component: ComponentType<any>) {
			const Wrapper = (props: Record<string, unknown>, ref: React.Ref<any>) => {
				const restProps = _.omit({ ...props, ref }, ['compId', 'compClassType'])
				return <Component {...restProps} />
			}
			return React.forwardRef(Wrapper)
		}
		return {
			executeWrappers: (Component: ComponentModule<unknown>['component'], compType?: string) => {
				const Comp = [{ wrapComponent: removeCompIdWrapper }, ...componentWrappers].reduce((acc, wrapper) => {
					// @ts-ignore
					acc = wrapper.wrapComponent(acc, compType)
					return acc
				}, Component)
				return Comp
			},
		}
	}
)
