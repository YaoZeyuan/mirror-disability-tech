import { isIOS } from './isIOS'

export const sendBeacon = (url: string): void => {
	let sent = false

	if (!isIOS()) {
		try {
			sent = navigator.sendBeacon(url)
		} catch {
			// TODO handle thrown error
		}
	}
	if (!sent) {
		new Image().src = url
	}
}
