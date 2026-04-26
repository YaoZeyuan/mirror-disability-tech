import { withDependencies } from '@wix/thunderbolt-ioc'
import type { ICommonConfig } from 'feature-common-config'
import { CommonConfigSymbol } from 'feature-common-config'
import type { BrowserWindow } from '@wix/thunderbolt-symbols'
import { BrowserWindowSymbol } from '@wix/thunderbolt-symbols'
import { MainBsiManager } from '@wix/bsi-manager'
import type { IBsiManager, Manager } from './types'
import type { IPageNumber } from 'feature-router'
import { PageNumberSymbol } from 'feature-router'

const generateGuid = () =>
	'xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx'.replace(/[xy]/g, function (e) {
		const i = (16 * Math.random()) | 0
		return ('x' === e ? i : (3 & i) | 8).toString(16)
	})

const bsiManagerFactory = (
	commonConfig: ICommonConfig,
	pageNumberHandler: IPageNumber,
	browserWindow: BrowserWindow
): IBsiManager => {
	const isSSR = !process.env.browser
	let bsiManager: Manager

	if (!isSSR) {
		const flowDomain = browserWindow?.location.host.match(/^flow(\..+)/)
		const options = flowDomain ? { cookieDomain: flowDomain[1] } : undefined

		bsiManager = MainBsiManager.create(
			{
				generateGuid,
				getCommonConfig: () => ({
					get: (key: 'bsi') => commonConfig.getCommonConfig()[key],
					set: (property, value) => commonConfig.updateCommonConfig({ [property]: value }),
				}),
			},
			options
		)
	} else {
		// Mock for SSR
		bsiManager = { getBsi: () => '' }
	}

	const getBsi = () => {
		const pageNumber = pageNumberHandler.getPageNumber()
		return bsiManager.getBsi(pageNumber)
	}

	return {
		getBsi,
		reportActivity: getBsi,
		onUrlChange: () => {
			getBsi()
		},
	}
}

export const BsiManager = withDependencies(
	[CommonConfigSymbol, PageNumberSymbol, BrowserWindowSymbol],
	bsiManagerFactory
)
