import React, { useEffect, useState } from 'react'

/**
 * in case components do not need SSR and have hydration errors this wrapper will render the component in the client side without hydration errors
 */
export function SafeHydrationWrapper(Comp: React.ElementType, compId: string) {
	function Wrapper(props: any) {
		const [isSecondRenderInClient, setIsSecondRenderInClient] = useState(false)
		useEffect(() => {
			setIsSecondRenderInClient(true)
		}, [])
		if (!isSecondRenderInClient) {
			return <div id={compId}></div>
		}

		return <Comp {...props} />
	}
	return Wrapper
}
