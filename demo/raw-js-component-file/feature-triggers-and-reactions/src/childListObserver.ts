import { named, withDependencies } from '@wix/thunderbolt-ioc'
import type { ChildListObserver, ChildListObserverCallback, ChildListObserverFactory } from './types'
import { BrowserWindowSymbol, FeatureExportsSymbol, pageIdSym } from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'
import { name } from './symbols'
import { getFullId, getRepeatedCompSelector } from '@wix/thunderbolt-commons'

export const childListObserverFactory = withDependencies(
	[pageIdSym, named(FeatureExportsSymbol, name), BrowserWindowSymbol, DomSelectorsSymbol],
	(
		pageIdSymbol: string,
		featureExports: any,
		browserWindow: any,
		domSelectors: IDomSelectors
	): ChildListObserverFactory =>
		(pageId, typeToHandlerForDynamicComps, compsToTriggers, dynamicCompToDescendants) => {
			const targetToParentMap = new WeakMap()

			const registerTriggers: ChildListObserverCallback = function (parentId, nodes) {
				const parent = dynamicCompToDescendants[parentId]

				const childrenSelector = Array.from(parent.children)
					.map((compId: string) => `#${compId}, ${getRepeatedCompSelector(compId)}`)
					.join()

				nodes.forEach((node) => {
					const children = domSelectors.querySelectorAll(childrenSelector, undefined, node as Element)

					if ((node as Element).matches(childrenSelector)) {
						children.push(node as Element)
					}

					children.forEach((child) => {
						const compToRegister = getFullId(child.id)
						const compTriggerData = compsToTriggers[compToRegister]

						Object.entries(compTriggerData).forEach(([triggerType, triggerData]) => {
							typeToHandlerForDynamicComps[triggerType]?.({
								compToRegister,
								triggerData,
								triggerType,
								pageId,
								element: child as HTMLElement,
							})
						})
					})
				})
			}

			const mutationHandler = (records: Array<MutationRecord>) => {
				records.forEach((record) => {
					if (record.addedNodes.length) {
						const parentId = targetToParentMap.get(record.target)
						registerTriggers?.(parentId, record.addedNodes)
					}
				})
			}

			const observer = new MutationObserver(mutationHandler)

			const observe: ChildListObserver['observe'] = (parentId, target, triggerOnObserve?) => {
				// only observe components that have children with triggers
				if (dynamicCompToDescendants[parentId]) {
					targetToParentMap.set(target, parentId)
					observer.observe(target, { childList: true })

					if (triggerOnObserve) {
						requestAnimationFrame(() => registerTriggers(parentId, target.childNodes))
					}
				}
			}

			const destroy: ChildListObserver['destroy'] = () => {
				observer.disconnect()
			}

			return {
				observe,
				destroy,
			}
		}
)
