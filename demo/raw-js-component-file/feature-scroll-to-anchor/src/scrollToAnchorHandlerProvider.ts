import { withDependencies } from '@wix/thunderbolt-ioc'
import type { IAnchorCompIdProvider, IScrollToAnchorHandlerProvider } from './types'
import { AnchorCompIdProviderSymbol } from './symbols'
import { TOP_AND_BOTTOM_ANCHORS } from './constants'
import type { IWindowScrollAPI } from 'feature-window-scroll'
import { WindowScrollApiSymbol } from 'feature-window-scroll'
import type { IStructureStore, BrowserWindow } from '@wix/thunderbolt-symbols'
import { Structure, BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import { DomSelectorsSymbol } from 'feature-dom-selectors'
import type { IDomSelectors } from 'feature-dom-selectors'

const scrollToAnchorHandlerProviderFactory = (
	{ getAnchorCompId }: IAnchorCompIdProvider,
	browserWindow: BrowserWindow,
	windowScrollApi: IWindowScrollAPI,
	structureStore: IStructureStore,
	domSelectors: IDomSelectors
): IScrollToAnchorHandlerProvider => {
	return {
		getHandler: () => (anchorData) => {
			const anchorDataId = ((anchorData.anchorDataId as { id: string })?.id || anchorData.anchorDataId || '') as string
			const anchorCompId = anchorData.anchorCompId ?? ''

			const isTopBottomAnchor = TOP_AND_BOTTOM_ANCHORS.includes(anchorDataId)
			if (isTopBottomAnchor) {
				windowScrollApi.scrollToComponent(anchorDataId)
				return true
			}

			const isStructureCompAnchor = structureStore.get(anchorCompId)
			const isHashAnchor = domSelectors.getByCompId(anchorCompId, browserWindow!.document)
			if (isStructureCompAnchor || isHashAnchor) {
				windowScrollApi.scrollToComponent(anchorCompId)
				return true
			}

			const anchorCompIdFromDataId = getAnchorCompId(anchorDataId) || ''
			if (structureStore.get(anchorCompIdFromDataId)) {
				// in responsive the anchorData doesn't include the comp id
				windowScrollApi.scrollToComponent(anchorCompIdFromDataId)
				return true
			}

			return false
		},
	}
}

export const ScrollToAnchorHandlerProvider = withDependencies(
	[AnchorCompIdProviderSymbol, BrowserWindowSymbol, WindowScrollApiSymbol, Structure, DomSelectorsSymbol],
	scrollToAnchorHandlerProviderFactory
)
