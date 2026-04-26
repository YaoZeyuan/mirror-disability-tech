import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IAppWillMountHandler } from '@wix/thunderbolt-symbols'
import { DomReadySymbol } from '@wix/thunderbolt-symbols'

export const createDomReadyPromise = (validate = false) =>
	new Promise<void>((resolve) => {
		const verifyAndResolve = () => {
			if (validate) {
				verifyBody()
			}

			resolve()
		}
		if (document.readyState === 'complete' || document.readyState === 'interactive') {
			verifyAndResolve()
		} else {
			document.addEventListener('readystatechange', verifyAndResolve, { once: true })
		}
	})

export const WaitForDomReady = withDependencies<IAppWillMountHandler>([DomReadySymbol], (domReady) => ({
	appWillMount: () => domReady,
}))

function verifyBody(): void {
	const ssrReturnedBody = typeof window.clientSideRender !== 'undefined'
	if (ssrReturnedBody) {
		return
	}

	window.clientSideRender = true
	window.santaRenderingError = window.santaRenderingError || {
		errorInfo: 'body failed to render',
	}

	const siteContainer = window.document.createElement('DIV')
	siteContainer.setAttribute('id', 'SITE_CONTAINER')
	window.document.body.appendChild(siteContainer)

	window.componentsRegistry?.manifestsLoadedResolve?.()
}
