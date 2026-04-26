import _ from 'lodash'
import { named, optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	BrowserWindow,
	IPageDidLoadHandler,
	ICompEventsRegistrar,
	ICompsLifeCycle,
	ILogger,
	IPageDidMountHandler,
	IPageDidUnmountHandler,
	IPageWillMountHandler,
	IPageWillUnmountHandler,
	IPropsStore,
} from '@wix/thunderbolt-symbols'
import {
	BrowserWindowSymbol,
	CompEventsRegistrarSym,
	CompsLifeCycleSym,
	FeatureStateSymbol,
	LoggerSymbol,
	PageFeatureConfigSymbol,
	pageIdSym,
	Props,
	FeatureExportsSymbol,
	PageTransitionsCompletedSymbol,
} from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import {
	ChildListObserverSymbol,
	ClassNameApiSymbol,
	name as featureName,
	ReactionCreatorFactorySymbol,
	scrubReactionsManagerSymbol,
	ShouldEnableTriggersAndReactionsSymbol,
	triggersBreakpointValidatorSymbol,
	ViewportIntersectionHandlerSymbol,
} from './symbols'
import { hasAncestorWithId } from './utils'
import { TriggerTypeEventNameMapper } from './constants'
import type {
	IReactionCreatorFactory,
	TargetCompIdReactions,
	TriggersAndReactionsPageConfig,
	IViewportIntersectionHandler,
	ITriggersBreakpointValidator,
	IShouldEnableTriggersAndReactions,
	IScrubReactionManager,
	RegisterTriggerFunctionParams,
	DynamicCompsHandlerParams,
	IClassNameApi,
	TriggersAndReactionsChildListObserverState,
	ChildListObserverFactory,
} from './types'
import { getFullId, REPEATER_DELIMITER, getTemplateItemId, tabClasses } from '@wix/thunderbolt-commons'
import type { IMotion, AnimationManager } from 'feature-motion'
import { MotionSymbol } from 'feature-motion'
import type { EffectsReactionData, StateReactionData } from '@wix/thunderbolt-becky-types'
import type { IFeatureState } from 'thunderbolt-feature-state'
import type { IFeatureExportsStore } from 'thunderbolt-feature-exports'
import type { IPageTransitionsCompleted } from 'feature-page-transitions'

const eventOptions = { addCompId: true }
const triggersAndReactionsFactory = (
	{
		compsToTriggers,
		isTouchDevice,
		compIdsWithAccessibleTrigger,
		effectTriggerToReaction,
		dynamicCompToDescendants,
		isMotionEnabled,
	}: TriggersAndReactionsPageConfig,
	featureState: IFeatureState<TriggersAndReactionsChildListObserverState>,
	triggersAndReactionsExports: IFeatureExportsStore<typeof featureName>,
	reactionCreatorFactory: IReactionCreatorFactory,
	compEventsRegistrar: ICompEventsRegistrar,
	browserWindow: NonNullable<BrowserWindow>,
	pageIdSymbol: string,
	props: IPropsStore,
	logger: ILogger,
	viewportIntersectionHandler: IViewportIntersectionHandler,
	{ isTriggerBpRangeInCurrentBreakpoint }: ITriggersBreakpointValidator,
	scrubEffectsManager: IScrubReactionManager,
	{ shouldEnableTriggersAndReactions }: IShouldEnableTriggersAndReactions,
	{ addClassName }: IClassNameApi,
	compsLifeCycle: ICompsLifeCycle,
	childListObserverFactory: ChildListObserverFactory,
	domSelectors: IDomSelectors,
	pageTransitionsCompleted?: IPageTransitionsCompleted,
	motion?: IMotion
): IPageWillMountHandler &
	IPageDidMountHandler &
	IPageDidUnmountHandler &
	IPageDidLoadHandler &
	IPageWillUnmountHandler => {
	let motionEffectsManager: AnimationManager | undefined

	const registerCommonTrigger = ({ compToRegister, triggerData, triggerType }: RegisterTriggerFunctionParams) => {
		compEventsRegistrar.register(
			compToRegister,
			TriggerTypeEventNameMapper[triggerType],
			reactionCreatorFactory.createReaction(triggerData, compToRegister),
			eventOptions
		)
	}

	const registerAnimationTrigger = ({ compToRegister, triggerData, triggerType }: RegisterTriggerFunctionParams) => {
		const triggerEffectToReactionData: Record<string, TargetCompIdReactions> = {}
		_.reduce(
			triggerData,
			(acc, reactionsData, targetCompId) => {
				reactionsData.forEach((reactionData) => {
					const currentBpRange = reactionData.triggerBpRange
					reactionData.reactions.forEach((reaction) => {
						const id = reaction.reactionData.name ? reaction.reactionData.name : reaction.reactionData.effect
						_.forEach(effectTriggerToReaction, (reactionsIds, trigger) => {
							if (reactionsIds.includes(`#${id}`)) {
								acc[trigger] = acc[trigger] || {}
								acc[trigger][targetCompId] = acc[trigger][targetCompId] || []

								acc[trigger][targetCompId] = [
									...acc[trigger][targetCompId],
									{
										triggerBpRange: { ...currentBpRange },
										reactions: [reaction],
									},
								]
							}
						})
					})
				})
				return acc
			},
			triggerEffectToReactionData
		)

		_.forEach(triggerEffectToReactionData, (data, effectId) => {
			motionEffectsManager?.addEffectCallback(
				effectId,
				triggerType,
				reactionCreatorFactory.createReaction(data, compToRegister)
			)
		})
	}

	const activeReactionsCompToTriggers: { [reactionCompId: string]: string } = {}

	const filterAnotherActiveReactionTrigger = (
		triggerData: TargetCompIdReactions,
		compToRegister: string,
		itemId = ''
	): TargetCompIdReactions => {
		const nonActiveTriggerData = _.mapValues(triggerData, (tuples) => {
			return tuples
				.map((tuple) => {
					let nonActiveReactions: Array<StateReactionData | EffectsReactionData> = []
					if (isTriggerBpRangeInCurrentBreakpoint(tuple)) {
						nonActiveReactions = tuple.reactions.filter((reactionData) => {
							const activeTrigger = activeReactionsCompToTriggers[reactionData.reactionData.name + itemId]
							if (activeTrigger !== compToRegister) {
								return false
							}
							activeReactionsCompToTriggers[reactionData.reactionData.name] = ''
							return true
						})
					}
					return { ...tuple, reactions: nonActiveReactions }
				})
				.filter((x) => x)
		})

		return nonActiveTriggerData
	}

	const setActiveTriggerComponent = (triggerData: TargetCompIdReactions, itemId: string, compToRegister: string) => {
		Object.keys(triggerData).forEach((originalTarget) => {
			const tuples = triggerData[originalTarget]
			tuples.forEach((tuple) => {
				if (isTriggerBpRangeInCurrentBreakpoint(tuple)) {
					tuple.reactions.forEach((reactionData) => {
						activeReactionsCompToTriggers[reactionData.reactionData.name + itemId] = compToRegister
					})
				}
			})
		})
	}

	const registerHoverTrigger = ({ compToRegister, triggerData, pageId }: RegisterTriggerFunctionParams) => {
		if (isTouchDevice) {
			const registerOuterClickCallback = (originalSrcCompId: string) => {
				let outerClickRegistration: Function | null
				const itemId = getTemplateItemId(originalSrcCompId) || ''
				const reverseReaction = (event: Event) => {
					if (
						// check if tap target is on a component inside the trigger component
						hasAncestorWithId(event.target, compToRegister)
					) {
						return
					}
					// check if tap is on another trigger component for the same reaction and filter
					const nonActiveTriggerData = filterAnotherActiveReactionTrigger(triggerData, compToRegister, itemId)

					// @ts-ignore
					event.compId = originalSrcCompId // we pass the original compId in order to be able reverse correct item in repeater

					reactionCreatorFactory.createReverseReaction(nonActiveTriggerData, compToRegister)(event)
					outerClickRegistration && compEventsRegistrar.unregister(pageId, 'onClick', outerClickRegistration)
					outerClickRegistration = null
				}

				setTimeout(() => {
					// we need to register only on next tick to prevent the eventsRegistrar from triggering the reverse reaction
					// immediately when the first reaction is invoked.
					outerClickRegistration = compEventsRegistrar.register(pageId, 'onClick', reverseReaction, eventOptions)
				}, 0)
				// set active trigger for every applied reaction
				setActiveTriggerComponent(triggerData, itemId, compToRegister)
			}
			compEventsRegistrar.register(
				compToRegister,
				'onClick',
				reactionCreatorFactory.createReaction(triggerData, compToRegister, registerOuterClickCallback),
				eventOptions
			)
		} else {
			compEventsRegistrar.register(
				compToRegister,
				'onMouseEnter',
				reactionCreatorFactory.createReaction(triggerData, compToRegister),
				eventOptions
			)
			compEventsRegistrar.register(
				compToRegister,
				'onMouseLeave',
				reactionCreatorFactory.createReverseReaction(triggerData, compToRegister),
				eventOptions
			)
		}
	}
	let activeElements: Array<any> = []
	const focusInHandler = (event: FocusEvent) => {
		const target = event.target as HTMLElement
		const siteContainer = window!.document.getElementById('SITE_CONTAINER')!
		const a11yEnabledInSession = tabClasses.some((className) => siteContainer.classList.contains(className))
		if (!a11yEnabledInSession) {
			return
		}
		activeElements.push(event.target)

		const triggerDataCurrent = compsToTriggers[target.id]?.focus
		if (triggerDataCurrent) {
			// apply effect when focused element is the trigger component
			reactionCreatorFactory.handleReaction(event, triggerDataCurrent, target.id, false)
		} else {
			// apply effect when focused element is a descendant of a trigger component
			Object.entries(compsToTriggers).forEach(([srcComp, triggerData]) => {
				if (triggerData.focus) {
					const itemId = getTemplateItemId(target.id)
					const compId = itemId ? `${srcComp}${REPEATER_DELIMITER}${itemId}` : srcComp
					const compElement = domSelectors.getByCompId(compId, browserWindow!.document)
					if (compElement && compElement!.contains(event.target as HTMLElement)) {
						reactionCreatorFactory.handleReaction(event, triggerData.focus, target.id, false)
					}
				}
			})
		}

		// remove effects from non-active elements
		const nonActiveElements = activeElements.filter((activeElement) => !activeElement.contains(event.target))
		nonActiveElements.forEach((element) => {
			const triggerDataToRemove = compsToTriggers[getFullId(element.id)]?.focus
			if (triggerDataToRemove) {
				reactionCreatorFactory.handleReaction(event, triggerDataToRemove, element.id, true)
			}
			activeElements = _.remove(activeElements, (e) => !(e.id === element.id))
		})
	}

	const keyDownHandler = (event: KeyboardEvent) => {
		if ((event.code === 'Space' || event.key === 'Enter') && event.target) {
			const target = event.target as HTMLElement
			const triggerData = compsToTriggers[getFullId(target.id)]?.keydown
			if (triggerData) {
				reactionCreatorFactory.handleReaction(event, triggerData, target.id, false)
			}
		}
	}

	let pageVisibleResolver: (value?: unknown) => void
	const pageVisiblePromise = new Promise((resolve) => (pageVisibleResolver = resolve))
	const registerPageVisibleTrigger = ({ pageId, triggerData }: RegisterTriggerFunctionParams) => {
		pageVisiblePromise.then(reactionCreatorFactory.createReaction(triggerData, pageId)).catch((e) =>
			logger.captureError(e, {
				tags: { feature: 'triggers-and-reactions', methodName: 'registerPageVisibleTrigger' },
			})
		)
	}

	const triggerTypeRegisterHandler: { [index: string]: Function } = {
		click: registerCommonTrigger,
		tap: registerCommonTrigger,
		'mouse-in': registerCommonTrigger,
		'mouse-out': registerCommonTrigger,
		hover: registerHoverTrigger,
		'animation-start': registerAnimationTrigger,
		'animation-end': registerAnimationTrigger,
		'page-visible': registerPageVisibleTrigger,
	}

	const addCssClassToClickTrigger = ({ compToRegister, triggerData }: RegisterTriggerFunctionParams) => {
		Object.keys(triggerData).forEach((originalTarget) => {
			const tuples = triggerData[originalTarget]
			if (tuples.some((tuple) => isTriggerBpRangeInCurrentBreakpoint(tuple))) {
				// we have to add the class the component after it was hydrated
				// if not, className will be ignored as it is not added in SSR and creates a mismatch
				compsLifeCycle
					.waitForComponentToRender(compToRegister)
					.then(() => {
						addClassName(compToRegister, 'has-click-trigger')
					})
					.catch((e) =>
						logger.captureError(e, {
							tags: { feature: 'triggers-and-reactions', methodName: 'addCssClassToClickTrigger' },
						})
					)
			}
		})
	}

	const triggerTypeOnDidMountHandler: { [index: string]: Function } = {
		click: addCssClassToClickTrigger,
	}

	const registerCompsByTriggerMap = (triggerToRegistryMap: { [triggerType: string]: Function }, pageId: string) => {
		Object.entries(compsToTriggers).forEach(([compToRegister, compTriggerData]) => {
			Object.entries(compTriggerData).forEach(([triggerType, triggerData]) => {
				triggerToRegistryMap[triggerType]?.({ compToRegister, triggerData, triggerType, pageId })
			})
		})
	}

	const observeViewportTrigger = ({
		element,
		compToRegister: compId,
	}: {
		element: HTMLElement
		compToRegister: string
	}) => {
		viewportIntersectionHandler.observe(element, compId)
	}

	const triggerPageVisibleOnDynamicComps = ({ element, triggerData }: DynamicCompsHandlerParams) => {
		pageVisiblePromise.then(reactionCreatorFactory.createReaction(triggerData, element.id)).catch((e) =>
			logger.captureError(e, {
				tags: { feature: 'triggers-and-reactions', methodName: 'triggerPageVisibleOnDynamicComps' },
			})
		)
	}

	const typeToHandlerForDynamicComps: { [index: string]: (args: DynamicCompsHandlerParams) => void } = {
		'page-visible': triggerPageVisibleOnDynamicComps,
		'viewport-enter': observeViewportTrigger,
		'viewport-leave': observeViewportTrigger,
		'pointer-move': scrubEffectsManager.observe,
		'view-progress': scrubEffectsManager.observe,
	}

	const observeChildListChange = (parentId: string, target: HTMLElement, triggerOnObserve?: boolean) => {
		const state = featureState.get()
		const parentComp = state?.dynamicCompToDescendants[parentId]

		if (parentComp) {
			const pageId = parentComp.pageId
			state[pageId]?.observe(parentId, target, triggerOnObserve)
		}
	}

	return {
		name: 'triggersAndReactions',
		async pageWillMount(pageId) {
			compIdsWithAccessibleTrigger.forEach((compId) => {
				const a11yProps = props.get(compId)?.a11y || {}
				props.update({
					[compId]: { a11y: { tabIndex: 0, ...a11yProps } },
				})
			})
			if (shouldEnableTriggersAndReactions) {
				if (isMotionEnabled && motion) {
					motionEffectsManager = motion.getManager()
				}

				// register triggers
				registerCompsByTriggerMap(triggerTypeRegisterHandler, pageId)

				if (pageIdSymbol !== 'masterPage') {
					triggersAndReactionsExports.export({ observeChildListChange })
				} else {
					triggersAndReactionsExports.export({ observeChildListChangeMaster: observeChildListChange })
				}

				const childListObserver = childListObserverFactory(
					pageIdSymbol,
					typeToHandlerForDynamicComps,
					compsToTriggers,
					dynamicCompToDescendants
				)

				featureState.update((state) => {
					if (!state) {
						state = {
							dynamicCompToDescendants: {},
						} as TriggersAndReactionsChildListObserverState
					}

					state[pageIdSymbol] = childListObserver

					if (state.dynamicCompToDescendants) {
						Object.assign(state.dynamicCompToDescendants, dynamicCompToDescendants)
					} else {
						state.dynamicCompToDescendants = dynamicCompToDescendants
					}

					return state
				})

				if (motionEffectsManager && pageTransitionsCompleted?.hasTransition) {
					pageTransitionsCompleted.onPageTransitionsCompleted(() => scrubEffectsManager.init())
				}
			}
		},
		pageDidMount() {
			if (shouldEnableTriggersAndReactions) {
				const shouldEnableAccessibilityTriggers = compIdsWithAccessibleTrigger.length > 0 && !isTouchDevice
				if (pageIdSymbol !== 'masterPage' && shouldEnableAccessibilityTriggers) {
					browserWindow.addEventListener('focusin', focusInHandler)
					browserWindow.addEventListener('keydown', keyDownHandler)
				}

				if (motionEffectsManager && !pageTransitionsCompleted?.hasTransition) {
					scrubEffectsManager.init()
				}

				viewportIntersectionHandler.init()

				registerCompsByTriggerMap(triggerTypeOnDidMountHandler, pageIdSymbol)
			}
		},
		pageDidLoad() {
			pageVisibleResolver()
		},
		pageDidUnmount() {
			if (shouldEnableTriggersAndReactions) {
				const shouldEnableAccessibilityTriggers = compIdsWithAccessibleTrigger.length > 0 && !isTouchDevice
				if (shouldEnableAccessibilityTriggers) {
					browserWindow.removeEventListener('keydown', keyDownHandler)
					browserWindow.removeEventListener('focusin', focusInHandler)
				}
				viewportIntersectionHandler.destroy()
			}
		},
		pageWillUnmount() {
			if (shouldEnableTriggersAndReactions) {
				scrubEffectsManager.destroy()

				Object.keys(effectTriggerToReaction).forEach((effectId) => {
					motionEffectsManager?.clearEffectCallbacks(effectId)
				})

				// clean up dynamic children observer
				const state = featureState.get()
				if (state && state[pageIdSymbol]) {
					state[pageIdSymbol].destroy()
					featureState.update((_state) => {
						delete _state[pageIdSymbol]
						return _state
					})
				}
			}
		},
	}
}

export const TriggersAndReactions = withDependencies(
	[
		named(PageFeatureConfigSymbol, featureName),
		named(FeatureStateSymbol, featureName),
		named(FeatureExportsSymbol, featureName),
		ReactionCreatorFactorySymbol,
		CompEventsRegistrarSym,
		BrowserWindowSymbol,
		pageIdSym,
		Props,
		LoggerSymbol,
		ViewportIntersectionHandlerSymbol,
		triggersBreakpointValidatorSymbol,
		scrubReactionsManagerSymbol,
		ShouldEnableTriggersAndReactionsSymbol,
		ClassNameApiSymbol,
		CompsLifeCycleSym,
		ChildListObserverSymbol,
		DomSelectorsSymbol,
		optional(PageTransitionsCompletedSymbol),
		optional(MotionSymbol),
	],
	triggersAndReactionsFactory
)
