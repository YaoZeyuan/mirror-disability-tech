import _ from 'lodash'
import type { ComponentType, MouseEventHandler } from 'react'
import React, { Suspense } from 'react'
import type { Reporter } from '../reporting'
import type { Props } from './tpaWidgetNative'
import { getSharedProps, getPropsForReactComponent } from './tpaWidgetNative'
import { getDataAttributes } from '@wix/thunderbolt-commons'

type State = {
	hasError: boolean
}

const TpaWidgetNativeDeadComp = React.lazy(
	() => import('./tpaWidgetNativeDeadComp/tpaWidgetNativeDeadComp' /* webpackChunkName: "tpaWidgetNativeDeadComp" */)
)

class TpaWidgetNativeErrorBoundary extends React.Component<Props, State> {
	constructor(props: Props) {
		super(props)

		this.state = { hasError: false }
	}

	componentDidCatch(error: Error) {
		this.props.reporter.reportError(error, this.props.sentryDsn, { tags: { phase: 'ooi component render' } })
	}

	componentWillUnmount() {
		this.props.host.unregisterFromComponentDidLayout()
	}

	static getDerivedStateFromError() {
		return { hasError: true }
	}

	render() {
		const ReactComponent = this.props.ReactComponent
		if (this.state.hasError || !ReactComponent) {
			return (
				<Suspense fallback={<div />}>
					<TpaWidgetNativeDeadComp {...this.props} />
				</Suspense>
			)
		}
		if (this.props.shouldWrapWithSuspense) {
			return (
				//  The <Suspense> is added to prevent the hydration from failing in the client.
				// We add <Suspense> to the component in the server in order to catch errors.
				<Suspense>
					<ReactComponent {...this.props} />
				</Suspense>
			)
		}
		return <ReactComponent {...this.props} />
	}
}

export const ooiReactComponentClientWrapper = (
	ReactComponent: ComponentType<any>,
	reporter: Reporter,
	shouldWrapWithSuspense: boolean,
	shouldAddIdAsClassName: boolean,
	shouldModifyComponentId: boolean,
	dontForceHeightAutoOOI: boolean,
	isBuilderComponentModel: boolean
) => {
	return (props: Props) => {
		if (props.__VIEWER_INTERNAL?.failedInSsr) {
			return (
				<Suspense fallback={<div />}>
					<TpaWidgetNativeDeadComp {...props} />
				</Suspense>
			)
		}

		return (
			<div
				{...getSharedProps(props, { shouldAddIdAsClassName, dontForceHeightAutoOOI, isBuilderComponentModel })}
				onMouseEnter={(props.onMouseEnter as MouseEventHandler) || _.noop}
				onMouseLeave={(props.onMouseLeave as MouseEventHandler) || _.noop}
				{...getDataAttributes(props)}
			>
				<TpaWidgetNativeErrorBoundary
					{...getPropsForReactComponent(props, shouldModifyComponentId)}
					ReactComponent={ReactComponent}
					reporter={reporter}
					shouldWrapWithSuspense={shouldWrapWithSuspense}
				/>
			</div>
		)
	}
}
