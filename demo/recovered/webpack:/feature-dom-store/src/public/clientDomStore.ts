import { withDependencies } from '@wix/thunderbolt-ioc'
import { BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import { DOM_STORE_DEFS_ID } from 'feature-react-renderer'
import type { IDomStore } from '../types'

export const ClientDomStore = withDependencies<IDomStore>([BrowserWindowSymbol] as const, (browserWindow) => {
	const getDefsElement = () => browserWindow.document.getElementById(DOM_STORE_DEFS_ID)!

	const hasElementId = (id: string) => !!browserWindow.document.getElementById(id)

	return {
		addHtml: (id, str) => {
			getDefsElement().insertAdjacentHTML('beforeend', str)
		},
		hasElementId,
	}
})
