import type { ComponentType, ReactNode, ReactElement } from 'react'
import React, { Fragment, useEffect, useLayoutEffect } from 'react'

const useIsomorphicLayoutEffect = process.env.browser ? useLayoutEffect : () => {}

export type PageMountUnmountProps = {
	children: () => ReactNode
	pageDidMount: (isMounted: boolean) => void
	shouldRunCodEmbedsCallbackOnce: boolean
	codeEmbedsCallback?: Function
	ComponentCss?: ReactElement
}

const PageMountUnmount: ComponentType<PageMountUnmountProps> = ({
	children,
	pageDidMount = () => {},
	shouldRunCodEmbedsCallbackOnce,
	codeEmbedsCallback,
	ComponentCss,
}) => {
	useEffect(() => {
		pageDidMount(true)
		return () => pageDidMount(false)
	}, [pageDidMount])

	useIsomorphicLayoutEffect(
		() => {
			codeEmbedsCallback?.()
			return undefined // destroy function
		},
		shouldRunCodEmbedsCallbackOnce ? [] : undefined
	)

	return (
		<Fragment>
			{ComponentCss}
			{children()}
		</Fragment>
	)
}

export default PageMountUnmount
