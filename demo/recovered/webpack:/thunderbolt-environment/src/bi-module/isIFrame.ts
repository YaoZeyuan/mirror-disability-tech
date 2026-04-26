export const isIFrame = (): '' | 'iframe' => {
	try {
		if (window.self === window.top) {
			return ''
		}
	} catch {
		// empty
	}
	return 'iframe'
}
