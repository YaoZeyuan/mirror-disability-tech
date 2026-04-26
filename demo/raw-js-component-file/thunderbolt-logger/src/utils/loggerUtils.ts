import type { Event } from '@wix/fe-essentials-viewer-platform/sentry/types'

const addTagsFromObject = (scope: any, obj: any) => {
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			scope.setTag(key, obj[key])
		}
	}
}
const addTagsFromObjectToEvent = (event: Event, obj: any) => {
	for (const key in obj) {
		if (obj.hasOwnProperty(key)) {
			event.tags = event.tags ?? {}
			event.tags[key] = obj[key]
		}
	}
}

const extractFingerprints = ({ values }: any) => {
	if (values && values.length) {
		const fingerprints = []
		fingerprints.push(values[0].value)
		fingerprints.push(values[0].type)
		if (values[0].stacktrace && values[0].stacktrace.length) {
			fingerprints.push(values[0].stacktrace[0].function)
		}
		return fingerprints
	}
	return ['noData']
}

const extractFileNameFromErrorStack = (errorStack: string) => {
	const stackArray = errorStack.match(/([\w-.]+(?:\.js|\.ts))/)
	if (!stackArray || !stackArray.length) {
		return 'anonymous function'
	}
	return stackArray[0].split('.')[0]
}

const shouldFilter = (message: string) => !message

export { addTagsFromObject, addTagsFromObjectToEvent, extractFingerprints, extractFileNameFromErrorStack, shouldFilter }
