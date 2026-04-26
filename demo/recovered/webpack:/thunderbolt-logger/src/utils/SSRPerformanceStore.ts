import { uniqueId } from 'lodash'
import type {
	PlatformAppPerformanceEvent,
	ResourceFetchPerformanceEvent,
	ServerPerformanceEvent,
} from '@wix/thunderbolt-types'

export const SSRPerformanceStore = (initialData: Array<ServerPerformanceEvent> = []) => {
	const eventData: Array<ServerPerformanceEvent> = initialData
	const platformAppEvents: Map<string, PlatformAppPerformanceEvent> = new Map()
	const resourceFetchEvents: Map<string, ResourceFetchPerformanceEvent> = new Map()

	const addSSRPerformanceEvent = (name: string) => {
		eventData.push({ name: `${name} (server)`, startTime: Date.now() })
	}
	const addSSRPerformanceEvents = (events: Array<ServerPerformanceEvent>) => {
		eventData.push(...events)
	}
	const getAllSSRPerformanceEvents = () => eventData

	function addPlatformAppEvent(eventId: string, event: PlatformAppPerformanceEvent) {
		platformAppEvents.set(eventId, { startTime: Date.now(), error: 'unfinished', ...event })
	}

	function finishPlatformAppEvent(eventId: string, error?: string) {
		const event = platformAppEvents.get(eventId)
		if (event) {
			event.endTime = Date.now()
			if (error) {
				event.error = error
			} else {
				delete event.error
			}
		}
	}

	function addResourceFetchEvent(event: ResourceFetchPerformanceEvent) {
		const eventId = uniqueId('fetchResource')
		resourceFetchEvents.set(eventId, { startTime: Date.now(), error: 'unfinished', ...event })

		return function finishResourceFetchEvent(error?: string) {
			const ev = resourceFetchEvents.get(eventId)
			if (ev) {
				ev.endTime = Date.now()
				if (error) {
					ev.error = error
				} else {
					delete ev.error
				}
			}
		}
	}

	function getAllPlatformAppEvents() {
		return Array.from(platformAppEvents.values())
	}

	function getAllResourceFetchEvents() {
		return Array.from(resourceFetchEvents.values())
	}

	return {
		addSSRPerformanceEvent,
		addResourceFetchEvent,
		getAllSSRPerformanceEvents,
		addSSRPerformanceEvents,
		addPlatformAppEvent,
		finishPlatformAppEvent,
		getAllPlatformAppEvents,
		getAllResourceFetchEvents,
	}
}
