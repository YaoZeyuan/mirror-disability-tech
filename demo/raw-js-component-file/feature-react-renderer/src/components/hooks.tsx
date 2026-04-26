import type { CompControllerUtils } from '@wix/thunderbolt-components-loader'
import Context from './AppContext'
import React, { useCallback, useContext, useEffect, useRef, useState, startTransition } from 'react'
import type {
	CompProps,
	PropsMap,
	StateRefsValuesMap,
	Store,
	ActionProps,
	Experiments,
	ILogger,
} from '@wix/thunderbolt-symbols'
import { CompEventSymbol } from '@wix/thunderbolt-symbols'
import {
	getDisplayedId,
	getDisplayedItemId,
	getRepeaterItemsAncestorChain,
	yieldToMain,
	getByCompId,
} from '@wix/thunderbolt-commons'
import _ from 'lodash'

const isVisibilityHidden = (compId: string, experiments?: Experiments, logger?: ILogger): boolean => {
	const elem = getByCompId(compId, {
		experiments,
		logger,
	})
	return elem ? window.getComputedStyle(elem).visibility === 'hidden' : false
}

const YIELD_TO_MAIN_COMPONENTS_BLACK_LIST = ['HoverBox']
const isEditor = process.env.PACKAGE_NAME === 'thunderbolt-ds'

const getFunctionWithEventProps =
	(
		fnName: string,
		fn: Function & { [CompEventSymbol]?: boolean },
		displayedId: string,
		experiments?: Experiments,
		logger?: ILogger
	) =>
	(...args: Array<any>) => {
		// overcome react bug where onMouseLeave is emitted if element becomes hidden while hovered
		// https://github.com/facebook/react/issues/22883
		if (fnName === 'onMouseLeave' && isVisibilityHidden(displayedId, experiments, logger)) {
			return
		}

		return fn[CompEventSymbol] ? fn({ args, compId: displayedId }) : fn(...args)
	}

const useFunctionProps = (
	displayedId: string,
	compProps: CompProps,
	propsFromController: CompProps,
	shouldYieldToMain: boolean = false,
	experiments?: Experiments,
	logger?: ILogger
) => {
	const { current: functionPropsWeakMap } = useRef<WeakMap<Function, Function>>(new WeakMap<Function, Function>())

	const updateFunctionPropsWeakMap = useCallback(
		(
			propName: string,
			prop: Function,
			_propsFromController: CompProps,
			_functionPropsWeakMap: WeakMap<Function, Function>
		) => {
			const _shouldYieldToMain = shouldYieldToMain && propName.startsWith('on')
			const functionWithEventProps = getFunctionWithEventProps(propName, prop, displayedId, experiments, logger)
			const propFunctionIsOverridden = _propsFromController?.[propName] && _propsFromController?.[propName] !== prop
			const asyncFunctionWithEventProps = async (...args: Array<any>) => {
				const [event, ...rest] = args
				const _event = _.clone(event)
				await yieldToMain()
				return functionWithEventProps(_event, ...rest)
			}
			const functionProp = propFunctionIsOverridden
				? (...args: Array<any>) => {
						_propsFromController?.[propName]?.(...args)
						return _shouldYieldToMain ? asyncFunctionWithEventProps(...args) : functionWithEventProps(...args)
					}
				: _shouldYieldToMain
					? asyncFunctionWithEventProps
					: functionWithEventProps
			_functionPropsWeakMap.set(prop, functionProp)
		},
		[displayedId, shouldYieldToMain, experiments, logger]
	)

	// update function props weak map on component props change (e.g. onClick)
	return Object.entries(compProps)
		.filter(([, prop]) => typeof prop === 'function')
		.reduce((acc, [propName, prop]) => {
			if (!functionPropsWeakMap.has(prop)) {
				updateFunctionPropsWeakMap(propName, prop, propsFromController, functionPropsWeakMap)
			}
			acc[propName] = functionPropsWeakMap.get(prop) as Function
			return acc
		}, {} as ActionProps)
}

export const useControllerHook = (displayedId: string, compType: string, _compProps: CompProps, compId: string) => {
	const { getCompBoundedUpdateProps, getCompBoundedUpdateStyles, compControllers, stateRefs, experiments, logger } =
		useContext(Context)
	const isRepeatedComp = displayedId !== compId
	const stateValues = getProps(stateRefs, isRepeatedComp, compId, displayedId)

	const compController = compControllers[compType]

	const compControllerUtilsRef = useRef<CompControllerUtils | undefined>(undefined)
	if (!compControllerUtilsRef.current && compController) {
		compControllerUtilsRef.current = {
			updateProps: getCompBoundedUpdateProps(displayedId),
			updateStyles: getCompBoundedUpdateStyles(displayedId),
		}
	}

	const propsFromCompController = compController?.useComponentProps(
		_compProps,
		stateValues,
		compControllerUtilsRef.current!
	)
	const compProps = propsFromCompController ?? _compProps
	const shouldYieldToMain = !isEditor && !YIELD_TO_MAIN_COMPONENTS_BLACK_LIST.includes(compType)
	const functionProps = useFunctionProps(
		displayedId,
		_compProps,
		propsFromCompController,
		shouldYieldToMain,
		experiments,
		logger
	)

	return { ...compProps, ...functionProps }
}

export const getProps = (
	store: Store<PropsMap> | Store<StateRefsValuesMap>,
	isRepeatedComp: boolean,
	compId: string,
	displayedId: string
) => {
	const props = { ...(store.get(compId) ?? {}) }
	if (isRepeatedComp) {
		const itemIds = getRepeaterItemsAncestorChain(getDisplayedItemId(displayedId)).reverse()
		itemIds.forEach((itemId) => {
			const currentProps = store.get(getDisplayedId(compId, itemId))
			Object.assign(props, currentProps)
		})
	}
	return props
}

export const useProps = (displayedId: string, compId: string): CompProps => {
	const { props: propsStore } = useContext(Context)
	const isRepeatedComp = displayedId !== compId
	return getProps(propsStore, isRepeatedComp, compId, displayedId)
}

export const useStoresObserver = (id: string, displayedId: string): void => {
	const {
		structure: structureStore,
		props: propsStore,
		stateRefs: stateRefsStore,
		getIsWaitingSuspense,
		registerRoutingBlocker,
		resolveRoutingBlocker,
	} = useContext(Context)

	const [, setTick] = useState(0)
	const forceUpdate = useCallback(() => {
		if (React.version?.startsWith('18') && getIsWaitingSuspense(displayedId)) {
			startTransition(() => setTick((tick) => tick + 1))
		} else {
			registerRoutingBlocker(displayedId)
			setTick((tick) => tick + 1)
		}
	}, [getIsWaitingSuspense, displayedId, registerRoutingBlocker])

	const subscribeToStores = () => {
		const stores = [propsStore, structureStore, stateRefsStore]
		const unSubscribers: Array<() => void> = []
		stores.forEach((store) => {
			const { unsubscribe, wasUpdatedBeforeSubscribe } = store.subscribeById(displayedId, forceUpdate)
			unSubscribers.push(unsubscribe)

			if (wasUpdatedBeforeSubscribe || displayedId !== id) {
				forceUpdate()
			}
			if (displayedId !== id) {
				const { unsubscribe: repeaterItemUnsubscribe } = store.subscribeById(id, forceUpdate)
				unSubscribers.push(repeaterItemUnsubscribe)
			}
		})

		return () => {
			unSubscribers.forEach((cb) => {
				resolveRoutingBlocker(displayedId)
				cb()
			})
		}
	}

	// eslint-disable-next-line react-hooks/exhaustive-deps
	useEffect(subscribeToStores, [id, displayedId])
}
