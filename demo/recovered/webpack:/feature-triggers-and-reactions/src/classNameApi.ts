import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IPropsStore } from '@wix/thunderbolt-symbols'
import { Props } from '@wix/thunderbolt-symbols'
import type { IClassNameApi } from './types'

export const ClassNameApi = withDependencies([Props], (props: IPropsStore): IClassNameApi => {
	const getClassNames = (compId: string) => {
		const className = props.get(compId)?.className
		return className ? className.split(' ') : []
	}

	const addClassName = (compId: string, className: string) => {
		const currentClassNames = getClassNames(compId)
		const uniqueClassNames = [...new Set([...currentClassNames, className])]
		props.update({ [compId]: { className: uniqueClassNames.join(' ') } })
	}

	const removeClassName = (compId: string, className: string) => {
		const currentClassNames = getClassNames(compId)
		const updatedClassName = currentClassNames
			.filter((currentClassName: string) => currentClassName !== className)
			.join(' ')
		props.update({ [compId]: { className: updatedClassName } })
	}

	return {
		addClassName,
		removeClassName,
	}
})
