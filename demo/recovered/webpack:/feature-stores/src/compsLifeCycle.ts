import { REPEATER_DELIMITER } from '@wix/thunderbolt-commons'
import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ICompsLifeCycle } from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import _ from 'lodash'

type CompCallbacks = { [compId: string]: { callbacks: { [callbackName: string]: Function } } }
type UnregisterFromCompLifeCycle = (compIds: Array<string>, callbackName: string) => void
const omitSingle = (key: string, { [key]: __, ...obj }) => obj

export const CompsLifeCycle = withDependencies([DomSelectorsSymbol], (domSelectors: IDomSelectors): ICompsLifeCycle => {
	const getAllTargets = (compId: string) =>
		domSelectors.querySelectorAll(`#${compId}, [id^="${compId}${REPEATER_DELIMITER}"]`) // supporting repeaters

	const onCompRenderedCallbacks: CompCallbacks = {}
	const mountedComponents: Record<string, boolean> = {}
	const registerToCompLifeCycle: ICompsLifeCycle['registerToCompLifeCycle'] = (compIds, callbackName, callback) => {
		compIds.forEach((compId) => {
			onCompRenderedCallbacks[compId] = onCompRenderedCallbacks[compId] || {}
			if (!onCompRenderedCallbacks[compId].callbacks) {
				onCompRenderedCallbacks[compId].callbacks = { [callbackName]: callback }
			} else {
				onCompRenderedCallbacks[compId].callbacks[callbackName] = callback
			}
		})
		return () => unregisterFromCompLifeCycle(compIds, callbackName)
	}

	const notifyCompDidMount: ICompsLifeCycle['notifyCompDidMount'] = (compId, displayedId) => {
		mountedComponents[compId] = true
		mountedComponents[displayedId] = true
		const triggerCallbacks = (callbacksObject: Record<string, Function>) =>
			Object.values(callbacksObject).forEach((cb) => {
				cb(compId, displayedId, domSelectors.getByCompId(displayedId))
			})

		if (onCompRenderedCallbacks[compId]) {
			triggerCallbacks(onCompRenderedCallbacks[compId].callbacks)
		}

		if (compId !== displayedId && onCompRenderedCallbacks[displayedId]) {
			// The call to waitForComponentToRender or registerToCompLifeCycle were called using a displayedId
			triggerCallbacks(onCompRenderedCallbacks[displayedId].callbacks)
		}
	}

	const unregisterFromCompLifeCycle: UnregisterFromCompLifeCycle = (compIds, callbackName) => {
		compIds.forEach((compId) => {
			onCompRenderedCallbacks[compId].callbacks = omitSingle(callbackName, onCompRenderedCallbacks[compId].callbacks)
		})
	}

	const waitForComponentToRender: ICompsLifeCycle['waitForComponentToRender'] = (compId) => {
		const callbackName = _.uniqueId('waitForComponentToRender_')
		if (mountedComponents[compId]) {
			const domElement = domSelectors.getByCompId(compId)
			if (!domElement) {
				const elements = getAllTargets(compId)
				if (!elements.length) {
					console.warn(`Component with id ${compId} was mounted but not found in the DOM`)
					return Promise.resolve([])
				}
				return Promise.resolve(Array.from(elements) as Array<HTMLElement>)
			}
			return Promise.resolve([domElement])
		}

		return new Promise((resolve) => {
			registerToCompLifeCycle([compId], callbackName, (__, ___, htmlElement) => {
				unregisterFromCompLifeCycle([compId], callbackName)
				resolve([htmlElement])
			})
		})
	}

	const componentDidUnmount: ICompsLifeCycle['componentDidUnmount'] = (compId, displayedId) => {
		mountedComponents[displayedId || compId] = false
	}

	return {
		registerToCompLifeCycle,
		notifyCompDidMount,
		waitForComponentToRender,
		componentDidUnmount,
	}
})
