import type { ComponentType, ReactNode } from 'react'
import React, { Fragment } from 'react'

export type DynamicStructureContainerCompProps = {
	children: () => ReactNode
	hasMaxWidth: boolean
	classNames: string
}

const DynamicStructureContainer: ComponentType<DynamicStructureContainerCompProps> = ({
	children,
	hasMaxWidth,
	classNames,
}) => {
	return (
		<Fragment>
			{hasMaxWidth ? <div className={`max-width-container ${classNames}`}>{children()}</div> : children()}
		</Fragment>
	)
}

export default DynamicStructureContainer
