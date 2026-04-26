import type { ComponentType, MouseEventHandler } from 'react'
import type { Reporter } from '../reporting'
import type { createHostProps } from '../hostProps'
import styles from './tpaWidgetNativeClient.scss'

export type Props = {
	id: string
	ReactComponent?: ComponentType<any>
	host: ReturnType<typeof createHostProps> & {
		registerToComponentDidLayout: (cb: Function) => void
		unregisterFromComponentDidLayout: () => void
	}
	sentryDsn?: string
	reporter: Reporter
	onMouseLeave: MouseEventHandler
	onMouseEnter: MouseEventHandler
	fitToContentHeight?: boolean
	heightOverflow?: boolean
	shouldWrapWithSuspense: boolean
	shouldAddIdAsClassName: boolean
	shouldModifyComponentId: boolean
	__VIEWER_INTERNAL?: { failedInSsr: boolean }
}

export type GetSharedPropsOptions = {
	shouldAddIdAsClassName?: boolean
	dontForceHeightAutoOOI?: boolean
	isBuilderComponentModel?: boolean
}

export const getSharedProps = (props: Props, options: GetSharedPropsOptions = {}) => {
	const { shouldAddIdAsClassName, dontForceHeightAutoOOI, isBuilderComponentModel } = options
	const isBuilderSite = dontForceHeightAutoOOI && isBuilderComponentModel
	return {
		id: props.id,
		className: [
			// if the site is builder site, height auto should be defined in the layout
			props.fitToContentHeight && !isBuilderSite ? styles.fitToContentHeight : '',
			props.heightOverflow ? styles.heightOverflow : '',
			shouldAddIdAsClassName ? props.id : '',
		].join(' '),
	}
}

export const getPropsForReactComponent = (props: Props, shouldModifyComponentId?: boolean) => {
	if (!shouldModifyComponentId) {
		return props
	}
	const ooiId = props.id + '_ooi'
	return { ...props, id: ooiId, host: { ...props.host, id: ooiId } }
}
