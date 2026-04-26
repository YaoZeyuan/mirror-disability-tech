import type { ComponentType, ReactNode } from 'react'
import React from 'react'

export type DivWithChildrenCompProps = {
	children: () => ReactNode
	id: string
	className: string
	componentsCss?: Array<{
		CSS: string
		contextId: string
	}>
}

const DivWithChildren: ComponentType<DivWithChildrenCompProps> = ({ children, id, className, componentsCss }) => {
	return (
		<div id={id} className={className}>
			{componentsCss &&
				componentsCss.map(({ CSS }) => {
					return CSS
				})}
			{children()}
		</div>
	)
}

export default DivWithChildren
