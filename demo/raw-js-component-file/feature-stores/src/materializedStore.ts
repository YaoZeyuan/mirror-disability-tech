import type {
	Subscriber,
	IMaterializedStore,
	IMaterializedSubStore,
	StoreWithUpdate,
	StateRefsMap,
} from '@wix/thunderbolt-symbols'
import { AppMaterializerSymbol, MaterializedStoreSymbol } from '@wix/thunderbolt-symbols'
import { getDisplayedId, getFullId, getTemplateItemId, getRefCompIdFromInflatedId } from '@wix/thunderbolt-commons'
import { createMaterializer } from '@wix/materializer'
import type { Materializer } from '@wix/thunderbolt-types'
import { withDependencies } from '@wix/thunderbolt-ioc'

type Subscribers<T> = Array<Subscriber<T>>

export const getMaterializedStore = (materializer: Materializer): IMaterializedStore => {
	let observedRoots: Array<string> = []
	let subscribers: Subscribers<any> = []
	let generalStore: Record<string, any> = {}

	return {
		unmount: () => {
			materializer.cleanAll()
			observedRoots = []
			subscribers = []
			generalStore = {}
		},
		createContextBasedStore: <T extends Record<string, any>>(subStoreName: string): StoreWithUpdate<T> => {
			observedRoots.push(subStoreName)
			const getPageStoreName = (id: string, pageId?: string) => {
				const subStore = materializer.get([subStoreName]) || {}
				const storeNames = Object.keys(subStore)
				return (
					storeNames.find((storeName) => storeName !== 'general' && subStore[storeName][id]) ||
					storeNames.find((storeName) => storeName !== 'general' && subStore[storeName][getFullId(id)]) ||
					storeNames.find(
						(storeName) => storeName !== 'general' && subStore[storeName][getRefCompIdFromInflatedId(id)]
					) ||
					(pageId && storeNames.find((storeName) => storeName !== 'general' && subStore[storeName][pageId])) ||
					'general'
				)
			}

			const getContextIdOfCompId = (compId: string): string | null => {
				const pageStore = getPageStoreName(compId)
				return pageStore === 'general' ? null : pageStore
			}

			const update = <TSpecificData>(partialStore: TSpecificData) => {
				const invalidations = materializer.batch((materializerUpdate) => {
					for (const compId in partialStore) {
						const pageStore = getPageStoreName(compId)
						materializerUpdate(subStoreName, pageStore, compId, partialStore[compId])
						if (pageStore === 'general') {
							generalStore[compId] = partialStore[compId]
						}
					}
				})

				const updates = Object.assign(
					{},
					...invalidations.map((path) => {
						const [, , compId] = path
						return { [compId]: materializer.get(path) }
					})
				)

				subscribers.forEach((cb) => {
					cb(updates)
				})
			}

			const moveToPageStore = (id: string, pageId: string) => {
				const currentStoreName = getPageStoreName(id, pageId)
				materializer.update(subStoreName, currentStoreName, id, undefined)
				const newStoreName = getPageStoreName(id, pageId)
				materializer.update(subStoreName, newStoreName, id, {})
			}

			const updatePageId = (id: string, pageId?: string) => {
				if (pageId && pageId !== id) {
					const currentStoreName = getPageStoreName(id)
					const currentStore = materializer.get([subStoreName, currentStoreName])

					if (!currentStore) {
						return
					}

					moveToPageStore(id, pageId)

					// repeater items with displayedIds inflated from 'id'
					const repeatersItems = Object.keys(currentStore).filter(
						(compId) => getDisplayedId(id, getTemplateItemId(compId)) === compId
					)
					repeatersItems.forEach((inflatedId) => moveToPageStore(inflatedId, pageId))
				}
			}

			return {
				get: (id: string) => {
					const pageStore = getPageStoreName(id)!
					return materializer.get([subStoreName, pageStore, id])
				},
				getContextIdOfCompId,
				setChildStore: (contextId: string, pageNewStore?: T) => {
					if (pageNewStore) {
						const payload = Object.keys(generalStore).reduce<Record<string, Record<string, any>>>(
							(acc, compId) => {
								if (
									pageNewStore[compId] ||
									pageNewStore[getFullId(compId)] ||
									pageNewStore[getRefCompIdFromInflatedId(compId)]
								) {
									acc[contextId][compId] = { ...pageNewStore[compId], ...generalStore[compId] }
									acc.general[compId] = undefined
									delete generalStore[compId]
								}
								return acc
							},
							{ general: {}, [contextId]: {} }
						)

						const contextStore = { ...pageNewStore, ...payload[contextId] }
						materializer.batch((materializerUpdate) => {
							for (const generalKey in payload.general) {
								materializerUpdate(subStoreName, 'general', generalKey, payload.general[generalKey])
							}

							for (const contextKey in contextStore) {
								materializerUpdate(subStoreName, contextId, contextKey, contextStore[contextKey])
							}
						})
					} else {
						const invalidations = materializer.update(subStoreName, contextId, undefined)
						const emptyStore = Object.assign({}, ...invalidations.map(([, , compId]) => ({ [compId]: null })))
						subscribers.forEach((cb) => cb(emptyStore))
					}
				},
				getEntireStore: () => {
					const { general, ...otherStores } = materializer.get(subStoreName)
					return Object.assign({}, general, ...Object.values(otherStores))
				},
				getAllKeys() {
					return new Set(Object.keys(this.getEntireStore()))
				},
				update,
				updatePageId,
				remove: () => {
					throw new Error('Unsupported')
				},
				set: () => {
					throw new Error('Unsupported')
				},
				subscribeToChanges: (cb: Subscriber<T>) => {
					subscribers.push(cb)
					return () => {
						const index = subscribers.indexOf(cb)
						if (index >= 0) {
							subscribers.splice(index, 1)
						}
					}
				},
			}
		},
		createStore: <T extends Record<string, any>>(subStoreName: string): IMaterializedSubStore<T> => {
			return {
				update: (partialStore: Partial<T>) => {
					const invalidations = materializer.batch((materializerUpdate) => {
						for (const key2 in partialStore) {
							for (const key3 in partialStore[key2]) {
								materializerUpdate(subStoreName, key2, key3, partialStore[key2][key3])
							}
						}
					})
					const updates = Object.assign(
						{},
						...invalidations.map((path) => {
							const [, , compId] = path
							return { [compId]: materializer.get(path) }
						})
					)

					subscribers.forEach((cb) => {
						cb(updates)
					})
				},
				get: (path: Array<string>) => {
					return materializer.get([subStoreName, ...path])
				},
			}
		},
	}
}

export const MaterializedStore = withDependencies([AppMaterializerSymbol], getMaterializedStore)
export const AppMaterializer = withDependencies([], () => createMaterializer())
export const StateRefs = withDependencies([MaterializedStoreSymbol], (materializer: IMaterializedStore) =>
	materializer.createContextBasedStore<StateRefsMap>('stateRefs')
)
