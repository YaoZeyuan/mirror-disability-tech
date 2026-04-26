import { optional, withDependencies } from '@wix/thunderbolt-ioc'
import type {
	IAppDidMountHandler,
	IStructureAPI,
	ILogger,
	TpaIFrame,
	ITpaPopup,
	TpaContextPicker,
	IPageFeatureLoader,
	Experiments,
	IPageProvider,
	IPageReflectorStateApi,
} from '@wix/thunderbolt-symbols'
import {
	StructureAPI,
	LoggerSymbol,
	CurrentRouteInfoSymbol,
	TpaPopupSymbol,
	DynamicFeatureLoader,
	ExperimentsSymbol,
} from '@wix/thunderbolt-symbols'
import { parseMessage } from '@wix/thunderbolt-commons'
import type { ITpaContextMapping, ITpaHandlersManager, PageInfo } from './types'
import { LogicalReflectorSymbol, LogicalReflectorStateSymbol } from 'feature-pages'
import { TpaContextMappingSymbol, TpaHandlersManagerSymbol } from './symbols'
import type { IWindowMessageRegistrar } from 'feature-window-message-registrar'
import { WindowMessageRegistrarSymbol } from 'feature-window-message-registrar'
import type { DebugApis } from 'feature-debug'
import { TbDebugSymbol } from 'feature-debug'
import { editorOnlyHandlers, isTpaMessage } from './tpaMessageUtilis'
import type { ILightboxUtils } from 'feature-lightbox'
import { LightboxUtilsSymbol } from 'feature-lightbox'
import type { ICurrentRouteInfo } from 'feature-router'

const isEditor = process.env.PACKAGE_NAME === 'thunderbolt-ds'
/**
 * This object's purpose is to comb through incoming window messages and assign TPA messages to the TpaHandler
 * instance in the correct IOC container (e.g the container that has the message sending component).
 */
export const TpaMessageContextPicker = withDependencies(
	[
		WindowMessageRegistrarSymbol,
		LogicalReflectorSymbol,
		LogicalReflectorStateSymbol,
		TpaContextMappingSymbol,
		StructureAPI,
		CurrentRouteInfoSymbol,
		DynamicFeatureLoader,
		ExperimentsSymbol,
		optional(LightboxUtilsSymbol),
		optional(LoggerSymbol),
		optional(TbDebugSymbol),
	],
	(
		windowMessageRegistrar: IWindowMessageRegistrar,
		pageProvider: IPageProvider,
		logicalReflectorState: IPageReflectorStateApi,
		tpaContextMapping: ITpaContextMapping,
		structureApi: IStructureAPI,
		currentRouteInfo: ICurrentRouteInfo,
		dynamicFeatureLoader: IPageFeatureLoader,
		experiments: Experiments,
		lightboxUtils?: ILightboxUtils,
		logger?: ILogger,
		debugApi?: DebugApis
	): IAppDidMountHandler & TpaContextPicker => {
		const getHandlersManagerForPage = async ({ contextId, pageId }: PageInfo): Promise<ITpaHandlersManager> => {
			if (isEditor) {
				const pageRef = await pageProvider(contextId, pageId)
				return pageRef.getAllImplementersOnPageOf<ITpaHandlersManager>(TpaHandlersManagerSymbol)[0]
			} else {
				return dynamicFeatureLoader.loadFeature<ITpaHandlersManager>('tpa', TpaHandlersManagerSymbol, {
					pageId,
					contextId,
				})
			}
		}

		// TpaIncomingMessage
		const getMessageSourceContainerId = ({ compId }: { compId: string }) => {
			if (!compId) {
				return
			}

			// getTpaComponentPageInfo() for persistent popups and chat in responsive
			// getContextIdOfCompId() to seek compId in structure if compId does not belong to tpa/ooi widget (i.e any random iframe with the js-sdk installed, e.g tpa galleries)
			const pageInfo = tpaContextMapping.getTpaComponentPageInfo(compId)
			if (!pageInfo || !pageInfo.contextId) {
				const contextId = structureApi.getContextIdOfCompId(compId)
				if (contextId) {
					return { contextId, pageId: contextId }
				}
			}
			return pageInfo
		}

		const getIsPersistentPopup = async (pageInfo: PageInfo | undefined, compId: string) => {
			if (pageInfo) {
				let popupApi

				if (isEditor) {
					const pageRef = await pageProvider(pageInfo!.contextId, pageInfo!.pageId)
					popupApi = pageRef.getAllImplementersOnPageOf<ITpaPopup>(TpaPopupSymbol)[0]
				} else {
					popupApi = await dynamicFeatureLoader.loadFeature<ITpaPopup>('tpa', TpaPopupSymbol, {
						pageId: pageInfo.pageId,
						contextId: pageInfo.contextId,
					})
				}

				if (!popupApi) {
					logger?.captureError(new Error('feature tpa not loaded'), {
						tags: {
							feature: 'tpa',
							isDynamicLoaded: true,
						},
						extra: {
							pageInfo,
							compId,
						},
					})
					return false
				}
				return popupApi?.getOpenedPopups()?.[compId]?.isPersistent
			}
			return false
		}

		return {
			getMessageSourceContainerId,
			appDidMount() {
				windowMessageRegistrar.addWindowMessageHandler({
					canHandleEvent(event: MessageEventInit) {
						return !!(event.source && isTpaMessage(parseMessage(event)))
					},
					async handleEvent(event: MessageEventInit) {
						const originalMessage = parseMessage(event)
						const { type, callId } = originalMessage
						const compIdFromTemplate = tpaContextMapping.getTpaComponentIdFromTemplate(originalMessage.compId)
						const compId = compIdFromTemplate ?? originalMessage.compId
						const message = { ...originalMessage, compId }

						if (editorOnlyHandlers.includes(type)) {
							return
						}

						let pageInfo = getMessageSourceContainerId(message)
						const contextId = pageInfo && pageInfo.contextId ? pageInfo.contextId : null

						const origin = event.origin!
						if (debugApi) {
							debugApi.tpa.addMessage({ message, compId, contextId, origin })
						}

						const currentContext = currentRouteInfo.getCurrentRouteInfo()?.contextId
						const currentLightboxId = lightboxUtils?.getCurrentLightboxId()
						const isPersistentPopup = await getIsPersistentPopup(pageInfo, compId)

						if (!contextId) {
							// invalid event data
							return
						}

						// ensure target context not already destroyed
						if (!logicalReflectorState.isContainerExistsForContext(contextId)) {
							if (isPersistentPopup) {
								// let persistentPopup also wire its handlers to the master page, at the moment this feature only used by stores, so it's a good guess
								pageInfo = { contextId: 'destroyed', pageId: 'destroyed' }
							} else {
								console.warn(`Ignored TPA message to a destroyed page ${contextId} from TPA ${compId} [${type}]`)
								return
							}
						}

						// ensure message belong to one of the active contexts - ignore messages from stale contexts even if they are not destroyed
						if (
							contextId !== 'masterPage' &&
							!isPersistentPopup &&
							contextId !== currentContext &&
							contextId !== currentLightboxId
						) {
							console.error('TPA handler message caller does not belong to any page', {
								type,
								callId,
								compId,
							})
							return
						}

						let pageHandlersManager: ITpaHandlersManager
						if (isPersistentPopup && pageInfo?.contextId === 'destroyed') {
							try {
								// destroyed context, try to use the current page's context to handle the message instead
								pageHandlersManager = await getHandlersManagerForPage({
									contextId: currentContext!,
									pageId: currentContext!,
								})
							} catch (e) {
								throw new Error(
									'Persistent popup context is destroyed and no current context available to handle the message'
								)
							}
						} else {
							pageHandlersManager = await getHandlersManagerForPage(pageInfo!)
						}

						pageHandlersManager.handleMessage({ source: event.source as TpaIFrame, origin, message }).catch((e) => {
							console.error('HandleTpaMessageError', type, contextId, compId, e)
							logger?.captureError(e, {
								tags: { feature: 'tpa', handlerName: type },
								extra: {
									handlerName: type,
									compId,
								},
							})
						})
					},
				})
			},
		}
	}
)
