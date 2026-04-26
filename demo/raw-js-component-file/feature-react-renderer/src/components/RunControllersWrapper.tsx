import type { ComponentType } from 'react'
import React from 'react'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { CompProps, Experiments } from '@wix/thunderbolt-symbols'
import { ExperimentsSymbol } from '@wix/thunderbolt-symbols'

const isCsr = !!process.env.browser

let useControllerHook: (
	displayedId: string,
	compType: string,
	_compProps: CompProps,
	compId: string
) => {
	[x: string]: any
}
;(async () => {
	isCsr && (await window.externalsRegistry.react.loaded)
	useControllerHook = require('./hooks').useControllerHook
})()

// Helper to check if className already contains the component ID
function containsId(className: string, id: string): boolean {
	return !!className && new RegExp(`(^|\\s)${id}(\\s|$)`).test(className)
}

// Merges two className strings without array allocation.
function mergeClassNames(a: string = '', b: string = ''): string {
	if (a && b) {
		return `${a} ${b}`
	}
	return a || b
}

export const RunControllersWrapper = withDependencies([ExperimentsSymbol], (experiments: Experiments) => {
	const addIdAsClassName = experiments['specs.thunderbolt.addIdAsClassName']
	const preserveWixSelectClass = experiments['specs.thunderbolt.preserveWixSelectClass']

	return {
		wrapComponent: (Component: ComponentType<any>) => {
			const Wrapper = ({
				compProps: storeProps,
				...restProps
			}: {
				compProps: any
				compId: string
				compClassType: string
				id: string
			}) => {
				const { id: displayedId, compId, compClassType } = restProps
				const compProps = useControllerHook(displayedId, compClassType, storeProps, compId)

				const props = {
					...compProps,
					...restProps,
				} as { [x: string]: any }

				const classNameId = addIdAsClassName ? displayedId : compId

				// Experiment on: merge Becky classes (compProps) + ID/wix-select (restProps).
				// Experiment off: legacy — compProps.className only.
				const existingClassName = preserveWixSelectClass
					? mergeClassNames(compProps?.className, (restProps as any)?.className)
					: (compProps?.className ?? '')

				const className = containsId(existingClassName, classNameId)
					? existingClassName
					: existingClassName
						? `${existingClassName} ${classNameId}`
						: classNameId

				return <Component {...props} className={className} />
			}
			return Wrapper
		},
	}
})
