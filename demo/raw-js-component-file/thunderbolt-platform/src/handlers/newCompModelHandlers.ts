import _ from 'lodash'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IPropsStore, SdkHandlersProvider, ViewerModel } from '@wix/thunderbolt-symbols'
import { Props, ViewerModelSym } from '@wix/thunderbolt-symbols'
import { serializeEvent } from './utils'
import type { NCMSdkHandlers } from '../types'

export default withDependencies(
	[Props, ViewerModelSym],
	(propsStore: IPropsStore, viewerModel: ViewerModel): SdkHandlersProvider<NCMSdkHandlers> => {
		const registeredCbs: {
			[__cbId: string]: (...args: Array<any>) => void
		} = {}

		let cbIndex = 0
		const cache: { [compId: string]: any } = {}

		return {
			getSdkHandlers: () => ({
				ncm: {
					triggerRegisteredCb: (__cbId: string, dataProps, functionNames, invokeFunction) => {
						if (registeredCbs[__cbId]) {
							functionNames.forEach((functionName) =>
								_.set(dataProps, functionName, (...args: any) => {
									if (process.env.browser || process.env.NODE_ENV === 'test') {
										const serializedEvent = serializeEvent(args)
										invokeFunction(functionName, serializedEvent)
									}
									return
								})
							)
							registeredCbs[__cbId](dataProps)
						}
					},
					setProps: (compId, dataProps, functionNames, invokeFunction) => {
						functionNames.forEach((functionName) =>
							_.set(dataProps, functionName, (...args: any) => {
								if (process.env.browser || process.env.NODE_ENV === 'test') {
									if (typeof args[0] === 'function') {
										const cb = args[0]
										const __cbId = `cb${cbIndex++}`
										registeredCbs[__cbId] = cb
										invokeFunction(functionName, { __cbId })
									} else {
										const serializedEvent = serializeEvent(args)
										invokeFunction(functionName, serializedEvent)
									}
								}
								return
							})
						)

						cache[compId] = cache[compId] || {}
						cache[compId] = _.merge(cache[compId], dataProps)
						propsStore.update({ [compId]: cache[compId] })
					},
				},
			}),
		}
	}
)
