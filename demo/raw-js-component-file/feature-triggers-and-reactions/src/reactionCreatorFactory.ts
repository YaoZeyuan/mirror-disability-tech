import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { IPageWillUnmountHandler, IPropsStore, Experiments } from '@wix/thunderbolt-symbols'
import { ExperimentsSymbol, PageFeatureConfigSymbol, Props } from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import { scrollInnerContent } from 'feature-container-slider'
import {
	MotionEffectsReactionsSymbol,
	name as featureName,
	ReactionsStateApiSymbol,
	triggersBreakpointValidatorSymbol,
} from './symbols'
import { getFullId } from '@wix/thunderbolt-commons'
import { getReactionTargetComps } from './utils'
import { ReverseStateReactionTypeMapper } from './constants'
import type {
	IReactionCreatorFactory,
	IReactionsStateApi,
	TargetCompIdReactions,
	TriggersAndReactionsPageConfig,
	MotionEffectsReactions,
	ITriggersBreakpointValidator,
} from './types'
import type { StateReactionData, EffectsReactionData } from '@wix/thunderbolt-becky-types'

const getPlayedReactionKey = (compId: string, reactionData: EffectsReactionData) => `${reactionData.id}__${compId}`

export const ReactionCreatorFactory = withDependencies(
	[
		named(PageFeatureConfigSymbol, featureName),
		ReactionsStateApiSymbol,
		Props,
		triggersBreakpointValidatorSymbol,
		MotionEffectsReactionsSymbol,
		DomSelectorsSymbol,
		ExperimentsSymbol,
	],
	(
		{ repeaterDescendantToRepeaterMapper }: TriggersAndReactionsPageConfig,
		reactionsStateApi: IReactionsStateApi,
		propsStore: IPropsStore,
		{ isTriggerBpRangeInCurrentBreakpoint }: ITriggersBreakpointValidator,
		motionEffectsReactions: MotionEffectsReactions,
		domSelectors,
		experiments: Experiments
	): IReactionCreatorFactory & IPageWillUnmountHandler => {
		let playedReactions = new WeakMap<HTMLElement, { [key: string]: boolean }>()
		const applyReaction = (
			{ type, reactionData }: StateReactionData | EffectsReactionData,
			componentId: string,
			callback?: Function
		) => {
			const element = domSelectors.getByCompId(componentId)
			const playedOnceKey = getPlayedReactionKey(componentId, reactionData)
			const shouldPlayOnceAndHasPlayed = element && playedReactions.get(element)?.[playedOnceKey]
			if (!element || shouldPlayOnceAndHasPlayed) {
				return
			}

			switch (type) {
				case 'AddState':
					reactionsStateApi.addState(reactionData.name, componentId)
					callback && callback(componentId)
					break
				case 'RemoveState':
					reactionsStateApi.removeState(reactionData.name, componentId)
					callback && callback(componentId)
					break
				case 'ToggleState':
					reactionsStateApi.toggleState(reactionData.name, componentId)
					break
				case 'RemoveAllStates':
					reactionsStateApi.removeAllStates(componentId)
					break
				case 'ScrollForward':
					scrollInnerContent(
						propsStore.get(getFullId(componentId)),
						componentId,
						'forward',
						domSelectors,
						!!experiments['specs.thunderbolt.dontTruncateScrollPosition']
					)
					break
				case 'ScrollBackward':
					scrollInnerContent(propsStore.get(getFullId(componentId)), componentId, 'backward', domSelectors)
					break
				case 'Play':
					motionEffectsReactions.play(reactionData.effect, componentId)
					break
				case 'TogglePlay':
					motionEffectsReactions.toggle(reactionData.effect, componentId, 'play')
					break
				case 'ToggleReverse':
					motionEffectsReactions.toggle(reactionData.effect, componentId, 'reverse')
					break
			}
			if (reactionData.once) {
				const currentState = playedReactions.get(element) || {}
				currentState[getPlayedReactionKey(componentId, reactionData)] = true
				playedReactions.set(element, currentState)
			}
		}
		const handleReaction = (
			event: any,
			targetToTuples: TargetCompIdReactions,
			srcCompId: string,
			isReversedReaction: boolean,
			callback?: Function
		) => {
			Object.keys(targetToTuples).forEach((originalTarget) => {
				const tuples = targetToTuples[originalTarget]
				const targets = getReactionTargetComps(
					originalTarget,
					// event.compId is added to event only for displayedId
					// if event was triggered from repeater item pass displayed id otherwise the original srcCompId
					event && event.compId ? event.compId : srcCompId,
					repeaterDescendantToRepeaterMapper,
					propsStore
				)
				for (const targetCompId of targets) {
					tuples
						.filter((tuple) => isTriggerBpRangeInCurrentBreakpoint(tuple))
						.forEach((tuple) =>
							tuple.reactions.forEach((t) => {
								if (isReversedReaction) {
									const reversedStateReactionType = ReverseStateReactionTypeMapper[t.type]
									if (reversedStateReactionType) {
										applyReaction({ ...t, type: reversedStateReactionType }, targetCompId)
									}
								} else {
									applyReaction(t, targetCompId, callback)
								}
							})
						)
				}
			})
		}

		const createCommonReaction = (
			targetToTuples: TargetCompIdReactions,
			srcCompId: string,
			isReversedReaction: boolean,
			callback?: Function
		) => {
			return (event: any) => {
				handleReaction(event, targetToTuples, srcCompId, isReversedReaction, callback)
			}
		}

		return {
			createReaction(targetToTuples, srcCompId, callback?) {
				return createCommonReaction(targetToTuples, srcCompId, false, callback)
			},
			createReverseReaction(targetToTuples, srcCompId) {
				return createCommonReaction(targetToTuples, srcCompId, true)
			},
			handleReaction,
			pageWillUnmount() {
				playedReactions = new WeakMap()
			},
		}
	}
)
