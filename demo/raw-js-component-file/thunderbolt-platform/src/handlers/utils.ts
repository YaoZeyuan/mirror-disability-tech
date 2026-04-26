import _ from 'lodash'

export const serializeEvent = (args: any = []) => {
	const [event, ...rest] = args
	// if SynteticEvent
	if (event?.nativeEvent) {
		// we want to serialize the event before awaiting cause react has an optimization
		// that reuses synthetic events and invalidates them between tasks
		const serializedEvent = _.omitBy(event, _.isObject)
		// we need to keep the native event data because it is used in the event API
		serializedEvent.nativeEvent = _.omitBy(event.nativeEvent, _.isObject)
		return [serializedEvent, ...rest]
	}
	return args
}
